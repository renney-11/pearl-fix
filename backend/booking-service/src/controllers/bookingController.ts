import type { RequestHandler } from "express";
import Availability from "../models/Availability";
import Booking from "../models/Booking";
import { MQTTHandler } from "../mqtt/MqttHandler";

const mqttHandler = new MQTTHandler(process.env.CLOUDAMQP_URL!);

 // Patient creates a booking (books a time slot)
//once successful u have to update patient, dentist with the booking info
export const createBooking: RequestHandler = async (req, res): Promise<void> => {
  const { dentistId, patientEmail, timeSlot } = req.body;

  try {
    await mqttHandler.connect();

    // Validate required fields
    if (!dentistId || !patientEmail || !timeSlot?.start || !timeSlot?.end) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    // Publish patient email to the topic to retrieve patient data
    await mqttHandler.publish(
      "pearl-fix/booking/create/patient/email",
      JSON.stringify({ email: patientEmail })
    );
    console.log(`Published patient email to "pearl-fix/booking/create/patient/email": ${patientEmail}`);

    // Collect patient data from the subscription
    const receivedPatient: any = await new Promise((resolve, reject) => {
      let patientData: any = null;
      const timeout = setTimeout(() => {
        if (patientData) {
          resolve(patientData);
        } else {
          reject(new Error("No patient received from MQTT subscription"));
        }
      }, 10000); // Adjust timeout based on expected delays

      mqttHandler.subscribe("pearl-fix/booking/create/patient", (msg) => {
        try {
          const message = JSON.parse(msg.toString());
          console.log("Message received on 'pearl-fix/booking/create/patient':", message);

          if (message.patient) {
            patientData = message.patient;
            clearTimeout(timeout); // Clear timeout as we got the data
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

    // Find dentist availability
    const availability = await Availability.findOne({ dentist: dentistId });
    if (!availability) {
      res.status(404).json({ message: "Dentist availability not found" });
      return;
    }

    // Publish dentistId directly to the topic to the clinic service
    await mqttHandler.publish(
      "pearl-fix/booking/find/clinic",
      JSON.stringify({ dentistId })
    );
    console.log(`Published dentistId to "pearl-fix/booking/find/clinic":`, dentistId);

    // Collect clinic data from the subscription (similar to how we did with patient data)
    const clinic: any = await new Promise((resolve, reject) => {
      let clinicData: any = null;
      const timeout = setTimeout(() => {
        if (clinicData) {
          resolve(clinicData);
        } else {
          reject(new Error("No clinic received from MQTT subscription"));
        }
      }, 10000); // Adjust timeout as needed

      mqttHandler.subscribe("pearl-fix/booking/clinic", (msg) => {
        try {
          const message = JSON.parse(msg.toString());
          console.log("Message received on 'pearl-fix/booking/clinic':", message);

          if (message.clinic) {
            clinicData = message.clinic;
            clearTimeout(timeout); // Clear timeout as we got the data
            resolve(clinicData);
          }
        } catch (error) {
          console.error("Error processing clinic message:", error);
        }
      });
    });

    if (!clinic?._id) {
      res.status(404).json({ message: "Clinic not found from MQTT data." });
      return;
    }

    const clinicIdFromMQTT = clinic._id;

    // Check if the time slot is available
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

    // Create the booking
    const booking = new Booking({
      dentistId,
      patientId: patientIdFromMQTT, // Use patient data from MQTT
      clinicId: clinicIdFromMQTT,   // Use clinic data from MQTT
      availabilityId: availability._id, // Add availabilityId reference
      timeSlot,
      status: "booked",
    });

    await booking.save();

    // Update the status of the time slot to "booked"
    availability.timeSlots[slotIndex].status = "booked";
    await availability.save(); // Save the updated availability document
    
    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });

    mqttHandler.close();
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Patient cancels a booking
 */
export const cancelBookingByPatient: RequestHandler = async (req, res): Promise<void> => {
  const { bookingId } = req.params;

  try {
    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    // Ensure the booking belongs to the patient making the request
    if (req.body.patientId !== booking.patientId) {
      res.status(403).json({ message: "You can only cancel your own bookings." });
      return;
    }

    // Update the booking status
    await Booking.findByIdAndDelete(bookingId);

    // Update the associated time slot to "available"
    const availability = await Availability.findOne({ dentistId: booking.dentistId });
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

    res.status(200).json({
      message: "Booking canceled successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Dentist cancels a booking
 */
export const cancelBookingByDentist: RequestHandler = async (req, res): Promise<void> => {
  const { bookingId } = req.params;

  try {
    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    // Ensure the booking belongs to the dentist making the request
    if (req.body.dentistId !== booking.dentistId) {
      res.status(403).json({ message: "You can only cancel bookings for your own schedule." });
      return;
    }

    // Update the booking status
    await Booking.findByIdAndDelete(bookingId);

    // Update the associated time slot to "available"
    const availability = await Availability.findOne({ dentistId: booking.dentistId });
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

    res.status(200).json({
      message: "Booking canceled successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
