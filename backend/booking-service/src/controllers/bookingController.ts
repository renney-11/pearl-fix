import type { RequestHandler } from "express";
import Availability from "../models/Availability";
import Booking from "../models/Booking";
import { MQTTHandler } from "../mqtt/MqttHandler";
import mongoose from "mongoose";
import sendEmailConfirmation from '../email/patient-books';
import sendCancellationEmail from '../email/patient-cancells';
import sendCancellationEmailByDentist from '../email/dentist-cancells';


const mqttHandler = new MQTTHandler(process.env.CLOUDAMQP_URL!);

// Helper method to continuously listen for booking data
const listenForBookingData = async (): Promise<void> => {
  try {
    await mqttHandler.connect();

    mqttHandler.subscribe("pearl-fix/booking/create", async (msg) => {
      try {
        const bookingData = JSON.parse(msg.toString());
        console.log("Received booking data:", bookingData);

        // Validate required fields
        if (!bookingData.dentistId || !bookingData.patientEmail || !bookingData.timeSlot) {
          console.error("Invalid booking data received:", bookingData);
          return;
        }

        // Call createBooking with a mock req and res
        const mockReq = {
          body: bookingData,
        } as unknown as Parameters<RequestHandler>[0];

        const mockRes = {
          status: (statusCode: number) => ({
            json: (response: any) => {
              console.log(`Response (${statusCode}):`, response);
              return response;
            },
          }),
        } as unknown as Parameters<RequestHandler>[1];

        const mockNext = () => {}; // This is an empty function, acting as the 'next' middleware

        await createBooking(mockReq, mockRes, mockNext);
      } catch (error) {
        console.error("Error processing booking data:", error);
      }
    });

    console.log("Listening for messages on 'pearl-fix/booking/create'...");
  } catch (error) {
    console.error("Error setting up MQTT listener:", error);
  }
};

// Patient creates a booking (books a time slot)
export const createBooking: RequestHandler = async (req, res): Promise<void> => {
  const { dentistId, patientEmail, timeSlot } = req.body;

  try {
    await mqttHandler.connect();

    if (!dentistId || !patientEmail || !timeSlot?.start || !timeSlot?.end) {
      res.status(400).json({ message: "Missing required fields" });
      
      // Publish failure message to the topic
      await mqttHandler.publish(
        "pearl-fix/booking/create/authenticate",
        JSON.stringify({ success: false, message: "Missing required fields" })
      );
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
      
      // Publish failure message to the topic
      await mqttHandler.publish(
        "pearl-fix/booking/create/authenticate",
        JSON.stringify({ success: false, message: "Patient not found from MQTT data." })
      );
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
      
      // Publish failure message to the topic
      await mqttHandler.publish(
        "pearl-fix/booking/create/authenticate",
        JSON.stringify({ success: false, message: "Clinic not found from MQTT data." })
      );
      return; // Exit on failure
    }

    const clinicName = clinic.clinicName;
    const clinicAddress = clinic.address;
    const clinicId = clinic._id; // Make sure to get clinicId

    await mqttHandler.publish(
      "pearl-fix/booking/find/dentist/for-clinic", // Topic to notify auth service
      JSON.stringify({ clinicId })
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
      
      // Publish failure message to the topic
      await mqttHandler.publish(
        "pearl-fix/booking/create/authenticate",
        JSON.stringify({ success: false, message: "Dentist email not found." })
      );
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
      
      // Publish failure message to the topic
      await mqttHandler.publish(
        "pearl-fix/booking/create/authenticate",
        JSON.stringify({ success: false, message: "The selected time slot is unavailable." })
      );
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
      
      // Publish failure message to the topic
      await mqttHandler.publish(
        "pearl-fix/booking/create/authenticate",
        JSON.stringify({ success: false, message: "The selected time slot is unavailable." })
      );
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

    // Publish success message to the topic
    await mqttHandler.publish(
      "pearl-fix/booking/create/authenticate",
      JSON.stringify({ success: true, message: "Booking created successfully." })
    );
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Server error" });
    
    // Publish failure message to the topic
    await mqttHandler.publish(
      "pearl-fix/booking/create/authenticate",
      JSON.stringify({ success: false, message: "Server error" })
    );
  }
};

export const getBookingsForPatient: RequestHandler = async (req, res) => {
  const { patientEmail } = req.body;

  try {
    // Check if patientEmail is provided
    if (!patientEmail) {
      res.status(400).json({ message: "Missing patientEmail in request body." });
      return;
    }

    // Publish patient email to retrieve patient ID
    await mqttHandler.publish(
      "pearl-fix/booking/create/patient/email",
      JSON.stringify({ email: patientEmail })
    );
    console.log(`Published patient email to "pearl-fix/booking/create/patient/email": ${patientEmail}`);

    // Retrieve patient data from MQTT subscription
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

    const patientIdFromMQTT = receivedPatient._id;

    // Fetch the bookings for the patient and exclude unnecessary fields
    const bookings = await Booking.find({ patientId: patientIdFromMQTT }).select(
      "-availabilityId -status -patientId -updatedAt -createdAt -__v"
    );

    if (!bookings || bookings.length === 0) {
      res.status(404).json({ message: "No bookings found for the specified patient." });
      return;
    }

    // Process each booking to get clinic details using dentistId
    const bookingsWithClinicDetails = await Promise.all(
      bookings.map(async (booking) => {
        const dentistId = booking.dentistId;

        // Publish dentistId to retrieve clinic details
        await mqttHandler.publish(
          "pearl-fix/booking/find/clinic",
          JSON.stringify({ dentistId })
        );
        console.log(`Published dentistId to "pearl-fix/booking/find/clinic": ${dentistId}`);

        // Retrieve clinic data from MQTT subscription
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

          // Publish failure message to the topic
          await mqttHandler.publish(
            "pearl-fix/booking/create/authenticate",
            JSON.stringify({ success: false, message: "Clinic not found from MQTT data." })
          );
          throw new Error("Clinic not found from MQTT data.");
        }

        return {
          clinicName: clinic.clinicName,
          clinicAddress: clinic.address,
          ...booking.toObject(), // Include booking details
        };
      })
    );

    res.status(200).json({
      message: "Bookings retrieved successfully.",
      bookings: bookingsWithClinicDetails,
    });
  } catch (error) {
    console.error("Error retrieving bookings for patient:", error);
    res.status(500).json({ message: "Server error. Could not retrieve bookings." });
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
await sendCancellationEmailByDentist(patientEmail, timeSlot, dentistEmail);
    // Respond with success
    res.status(200).json({
      message: "Booking canceled successfully.",
      dentistEmail,
      patientEmail,
    });

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

// Start listening for bookings
listenForBookingData();