import type { RequestHandler } from "express";
import Availability from "../models/Availability";
import Booking from "../models/Booking";
import { MQTTHandler } from "../mqtt/MqttHandler";
import mongoose from "mongoose";
import sendEmailConfirmation from '../email/send-email';
import sendCancellationEmail from '../email/cancellation';

const mqttHandler = new MQTTHandler(process.env.CLOUDAMQP_URL!);

// Patient creates a booking (books a time slot)
export const createBooking: RequestHandler = async (req, res): Promise<void> => {
  const { dentistId, patientEmail, timeSlot } = req.body;

  try {
    await mqttHandler.connect();

    if (!dentistId || !patientEmail || !timeSlot?.start || !timeSlot?.end) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    await mqttHandler.publish(
      "pearl-fix/booking/create/patient/email",
      JSON.stringify({ email: patientEmail })
    );
    console.log(`Published patient email to "pearl-fix/booking/create/patient/email": ${patientEmail}`);

    const receivedPatient: any = await new Promise((resolve, reject) => {
      let patientData: any = null;
      const timeout = setTimeout(() => {
        if (patientData) {
          resolve(patientData);
        } else {
          reject(new Error("No patient received from MQTT subscription"));
        }
      }, 10000);

      mqttHandler.subscribe("pearl-fix/booking/create/patient", (msg) => {
        try {
          const message = JSON.parse(msg.toString());
          console.log("Message received on 'pearl-fix/booking/create/patient':", message);

          if (message.patient) {
            patientData = message.patient;
            clearTimeout(timeout);
            resolve(patientData);
          }
        } catch (error) {
          console.error("Error processing patient message:", error);
        }
      });
    });

    if (!receivedPatient?._id) {
      res.status(404).json({ message: "Patient not found from MQTT data." });
      return;
    }

    const patientIdFromMQTT = receivedPatient._id;

    // Process clinic data
    await mqttHandler.publish(
      "pearl-fix/booking/find/clinic",
      JSON.stringify({ dentistId })
    );
    console.log(`Published dentistId to "pearl-fix/booking/find/clinic":`, dentistId);

    const clinic: any = await new Promise((resolve, reject) => {
      let clinicData: any = null;
      const timeout = setTimeout(() => {
        if (clinicData) {
          resolve(clinicData);
        } else {
          reject(new Error("No clinic received from MQTT subscription"));
        }
      }, 10000);

      mqttHandler.subscribe("pearl-fix/booking/clinic", (msg) => {
        try {
          const message = JSON.parse(msg.toString());
          console.log("Message received on 'pearl-fix/booking/clinic':", message);

          if (message.clinic) {
            clearTimeout(timeout);
            resolve(message.clinic);
          }
        } catch (error) {
          console.error("Error processing clinic message:", error);
        }
      });
    });

    if (!clinic?._id) {
      console.error("Clinic not found from MQTT data.");
      await mqttHandler.publish(
        "pearl-fix/availability/confirmation",
        JSON.stringify({ status: "failure", message: "Clinic not found from MQTT data." })
      );
      return; // Exit on failure
    }

// Extract clinic name and address
const clinicName = clinic.clinicName;
const clinicAddress = clinic.address;

const clinicId = clinic._id; // Make sure to get clinicId

// Publish clinicId to an MQTT topic for the auth service to subscribe to
await mqttHandler.publish(
  "pearl-fix/booking/find/dentist/for-clinic", // Topic to notify auth service
  JSON.stringify({ clinicId }) // Sending the clinicId to find the relevant dentist
);
console.log(`Published clinicId to "pearl-fix/booking/find/dentist/for-clinic": ${clinicId}`);

const dentistEmail: string = await new Promise((resolve, reject) => {
  let dentistEmailData: string | null = null;
  const timeout = setTimeout(() => {
    if (dentistEmailData) {
      resolve(dentistEmailData);
    } else {
      reject(new Error("No dentist email received from MQTT subscription"));
    }
  }, 10000);

  mqttHandler.subscribe("pearl-fix/booking/find/dentist/email", (msg) => {
    try {
      const message = JSON.parse(msg.toString());
      console.log("Message received on 'pearl-fix/booking/find/dentist/email':", message);

      if (message.email) {
        dentistEmailData = message.email;
        clearTimeout(timeout);
        resolve(dentistEmailData);
      }
    } catch (error) {
      console.error("Error processing dentist email message:", error);
    }
  });
});

if (!dentistEmail) {
  res.status(404).json({ message: "Dentist email not found." });
  return;
}

console.log("Received dentist email:", dentistEmail);

    // Directly check if availability exists for the selected dentist and time slot
    const availability = await Availability.findOne({
      dentist: dentistId,
      "timeSlots.start": { $lte: new Date(timeSlot.start) }, // Check if timeSlot start is before or equal
      "timeSlots.end": { $gte: new Date(timeSlot.end) }, // Check if timeSlot end is after or equal
      "timeSlots.status": "available",
    });

    if (!availability) {
      res.status(400).json({ message: "The selected time slot is unavailable." });
      return;
    }

    const slotIndex = availability.timeSlots.findIndex(
      (slot) =>
        slot.start.toISOString() === new Date(timeSlot.start).toISOString() &&
        slot.end.toISOString() === new Date(timeSlot.end).toISOString() &&
        slot.status === "available"
    );

    if (slotIndex === -1) {
      res.status(400).json({ message: "The selected time slot is unavailable." });
      return;
    }

    // Create booking
    const booking = new Booking({
      dentistId,
      patientId: patientIdFromMQTT,
      clinicId: availability.clinicId, // Assuming clinicId is available in Availability schema
      availabilityId: availability._id,
      timeSlot,
      status: "booked",
      clinicName,
      clinicAddress,
    });

    await booking.save();

    availability.timeSlots[slotIndex].status = "booked";
    await availability.save();
    
    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });

    await mqttHandler.publish(
      "pearl-fix/booking/update/dentist",
      JSON.stringify({
        dentistId,
        availability,
        booking,
      })
    );
    console.log(`Published dentist, availability, and booking to "pearl-fix/booking/update/dentist"`);

    await mqttHandler.publish(
      "pearl-fix/booking/update/patient",
      JSON.stringify({
        patientId: patientIdFromMQTT,
        booking,
      })
    );
    console.log(`Published patient and booking to "pearl-fix/booking/update/patient"`);

    // Send the email confirmation to the patient
    const patientName = receivedPatient.name; // Assuming the patient name is available
    await sendEmailConfirmation(patientEmail, receivedPatient.name, timeSlot, clinicName, clinicAddress, dentistEmail);

    console.log(`Booking confirmation email sent to: ${patientEmail}`);

  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Server error" });
  }
};



// Patient cancels booking
export const cancelBookingByPatient: RequestHandler = async (req, res): Promise<void> => {
  const { bookingId } = req.params;
  const { patientId } = req.body;

  try {
    await mqttHandler.connect();
    // Find booking by ID
    const booking = await Booking.findOne({ _id: new mongoose.Types.ObjectId(bookingId) });

    console.log("Found Booking:", booking);
    if (!booking) {
      res.status(404).json({ message: "Booking not found." });
      return;
    }

    if (String(booking.patientId) !== String(patientId)) {
      res.status(403).json({ message: "You can only cancel your own bookings." });
      return;
    }

    // Delete the booking
    await Booking.findByIdAndDelete(bookingId);

    const availability = await Availability.findOne({ _id: booking.availabilityId });
    if (availability) {
      const slot = availability.timeSlots.find(
        (slot) =>
          slot.start.toISOString() === booking.timeSlot.start.toISOString() &&
          slot.end.toISOString() === booking.timeSlot.end.toISOString()
      );

      if (slot) {
        slot.status = "available";
        await availability.save();
      }
    }

    await mqttHandler.publish(
      "pearl-fix/booking/update/dentist",
      JSON.stringify({
        dentistId: booking.dentistId,
        availability: {
          _id: booking.availabilityId
        },
        booking: {
          _id: booking._id
        }
      })
    );
    console.log(`Published dentist, availability, and canceled booking to "pearl-fix/booking/update/dentist"`);


    await mqttHandler.publish(
      "pearl-fix/booking/update/patient",
      JSON.stringify({
        patientId: booking.patientId,
        booking: {
          _id: booking._id
        }
      })
    );
    console.log(`Published patient and canceled booking to "pearl-fix/booking/update/patient"`);

    // Publish bookingId to the cancellation topic
await mqttHandler.publish(
  "pearl-fix/booking/canceled",
  JSON.stringify({ bookingId })
);
console.log(`Published canceled bookingId to "pearl-fix/booking/canceled": ${bookingId}`);

// Subscribe and retrieve dentist's email
const dentistEmail: string = await new Promise((resolve, reject) => {
  let email: string | null = null;
  const timeout = setTimeout(() => {
    if (email) resolve(email);
    else reject(new Error("Dentist email not received within timeout"));
  }, 10000);

  mqttHandler.subscribe("pearl-fix/booking/canceled/dentist-email", (msg) => {
    try {
      const { email: receivedEmail } = JSON.parse(msg.toString());
      console.log("Received dentist email:", receivedEmail);
      email = receivedEmail;
      clearTimeout(timeout);
      resolve(receivedEmail);
    } catch (error) {
      console.error("Error processing dentist email message:", error);
    }
  });
});

// Subscribe and retrieve patient's email
const patientEmail: string = await new Promise((resolve, reject) => {
  let email: string | null = null;
  const timeout = setTimeout(() => {
    if (email) resolve(email);
    else reject(new Error("Patient email not received within timeout"));
  }, 10000);

  mqttHandler.subscribe("pearl-fix/booking/canceled/patient-email", (msg) => {
    try {
      const { email: receivedEmail } = JSON.parse(msg.toString());
      console.log("Received patient email:", receivedEmail);
      email = receivedEmail;
      clearTimeout(timeout);
      resolve(receivedEmail);
    } catch (error) {
      console.error("Error processing patient email message:", error);
    }
  });
});

console.log("Successfully received emails:", { dentistEmail, patientEmail });

// Convert timeSlot start and end from Date to string
const timeSlot = {
  start: booking.timeSlot.start.toISOString(),
  end: booking.timeSlot.end.toISOString(),
};

// Send cancellation email to both patient and dentist
await sendCancellationEmail(patientEmail, timeSlot, dentistEmail);
    // Respond with success
    res.status(200).json({
      message: "Booking canceled successfully.",
      dentistEmail,
      patientEmail,
    });
    } catch (error) {
    console.error("Error in cancelBookingByPatient:", error);
    res.status(500).json({ message: "Server error." });
  } finally {
    mqttHandler.close();
  }
};

// Dentist cancels a booking
export const cancelBookingByDentist: RequestHandler = async (req, res): Promise<void> => {
  const { bookingId } = req.params;
  const { dentistId } = req.body;

  try {
    await mqttHandler.connect();

    const booking = await Booking.findOne({ _id: new mongoose.Types.ObjectId(bookingId) });

    console.log("Found Booking:", booking);
    if (!booking) {
      res.status(404).json({ message: "Booking not found." });
      return;
    }

    if (String(booking.dentistId) !== String(dentistId)) {
      res.status(403).json({ message: "You can only cancel your own bookings." });
      return;
    }

    // Delete the booking
    await Booking.findByIdAndDelete(bookingId);

    const availability = await Availability.findOne({ _id: booking.availabilityId });
    if (availability) {
      const slot = availability.timeSlots.find(
        (slot) =>
          slot.start.toISOString() === booking.timeSlot.start.toISOString() &&
          slot.end.toISOString() === booking.timeSlot.end.toISOString()
      );

      if (slot) {
        slot.status = "available";
        await availability.save();
      }
    }

    res.status(200).json({ message: "Booking canceled successfully." });

    await mqttHandler.publish(
      "pearl-fix/booking/update/dentist",
      JSON.stringify({
        dentistId: booking.dentistId,
        availability: {
          _id: booking.availabilityId
        },
        booking: {
          _id: booking._id
        }
      })
    );
    console.log(`Published dentist, availability, and canceled booking to "pearl-fix/booking/update/dentist"`);


    await mqttHandler.publish(
      "pearl-fix/booking/update/patient",
      JSON.stringify({
        patientId: booking.patientId,
        booking: {
          _id: booking._id
        }
      })
    );
    console.log(`Published patient and canceled booking to "pearl-fix/booking/update/patient"`);

  } catch (error) {
    console.error("Error in cancelBookingByPatient:", error);
    res.status(500).json({ message: "Server error." });
  } finally {
    mqttHandler.close();
  }
};