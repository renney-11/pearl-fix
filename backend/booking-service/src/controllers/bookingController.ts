import type { RequestHandler } from "express";
import Availability from "../models/Availability";
import Booking from "../models/Booking";
import { MQTTHandler } from "../mqtt/MqttHandler";
import mongoose from "mongoose";
import sendEmailConfirmation from '../email/patient-books';
import sendCancellationEmail from '../email/patient-cancells';
import sendCancellationEmailByDentist from '../email/dentist-cancells';
import { initializeAvailabilityGauge } from "../metrics/availabilityMetrics";
import { decrementAvailability } from "../metrics/availabilityMetrics";
import { incrementAvailability } from "../metrics/availabilityMetrics";
import mqtt from "mqtt/*";

(async () => {
  try {
    // Initialize gauge on service startup
    await initializeAvailabilityGauge();
  } catch (error) {
    console.error("Error initializing metrics:", error);
  }
})();

const mqttHandler = new MQTTHandler(process.env.CLOUDAMQP_URL!);


// GET BOOKINGS FOR PATIENT
(async () => {
  try {
    await mqttHandler.connect();
    console.log("Connected to MQTT broker.");

    await mqttHandler.subscribe("pearl-fix/booking/patient/email", async (msg) => {
      console.log("Received message on 'pearl-fix/booking/patient/email':", msg.toString());

      try {
        const receivedPatientEmail = JSON.parse(msg.toString());
        const patientEmail = receivedPatientEmail.patientEmail;
        console.log("Patient email:", patientEmail);

        if (!patientEmail) {
          const errorMessage = "Missing patientEmail in request body.";
          console.error(errorMessage);

          await mqttHandler.publish(
            "pearl-fix/booking/patient/all-data",
            JSON.stringify({ success: false, message: errorMessage })
          );
          return;
        }

        await mqttHandler.publish(
          "pearl-fix/booking/create/patient/email/test",
          JSON.stringify({ email: patientEmail })
        );
        console.log(`Published patient email to "pearl-fix/booking/create/patient/email": ${patientEmail}`);
        await mqttHandler.subscribe("pearl-fix/booking/create/patient/test", async (msg) => {
          console.log("Received message on 'pearl-fix/booking/create/patient':", msg.toString());

          try {
            const receivedPatient = JSON.parse(msg.toString());
            console.log("Received patient:", receivedPatient);

            if (!receivedPatient) {
              const errorMessage = "No patient received from MQTT subscription.";
              console.error(errorMessage);

              await mqttHandler.publish(
                "pearl-fix/booking/patient/all-data",
                JSON.stringify({ success: false, message: errorMessage })
              );
              return;
            }

            const patientIdFromMQTT = receivedPatient.patient._id;
            console.log("Patient ID from MQTT:", patientIdFromMQTT);

            // Fetch bookings for the patient
            const bookings = await Booking.find({ patientId: patientIdFromMQTT }).select(
              "-availabilityId -status -patientId -updatedAt -createdAt -__v"
            );
            console.log("Bookings found:", bookings);

            if (!bookings || bookings.length === 0) {
              const errorMessage = "No bookings found for the specified patient.";
              console.error(errorMessage);

              await mqttHandler.publish(
                "pearl-fix/booking/patient/all-data",
                JSON.stringify({ success: false, message: errorMessage })
              );
              return;
            }

            const bookingsWithDetails: any[] = []; // Collect all processed bookings

            // Process each booking to get clinic details
            for (const booking of bookings) {
              const dentistId = booking.dentistId;

              // Publish dentistId to retrieve clinic details
              await mqttHandler.publish(
                "pearl-fix/booking/find/clinic",
                JSON.stringify({ dentistId })
              );
              console.log(`Published dentistId to "pearl-fix/booking/find/clinic": ${dentistId}`);

              await mqttHandler.subscribe("pearl-fix/booking/clinic", async (msg) => {
                console.log("Received message on 'pearl-fix/booking/clinic':", msg.toString());

                try {
                  const clinic = JSON.parse(msg.toString());
                  console.log("Received clinic:", clinic);

                  if (!clinic?.clinic?._id) {
                    const errorMessage = "Clinic not found from MQTT data.";
                    console.error(errorMessage);

                    await mqttHandler.publish(
                      "pearl-fix/booking/patient/all-data",
                      JSON.stringify({ success: false, message: errorMessage })
                    );
                    return;
                  }

                  const bookingWithClinicDetails = {
                    clinicName: clinic.clinic.clinicName,
                    clinicAddress: clinic.clinic.address,
                    ...booking.toObject(),
                  };
                  console.log("Booking with clinic details:", bookingWithClinicDetails);

                  // Add processed booking to the collection
                  bookingsWithDetails.push(bookingWithClinicDetails);

                  // If all bookings are processed, send them in a single message
                    console.log("All bookings processed successfully:", bookingsWithDetails);

                    await mqttHandler.publish(
                      "pearl-fix/booking/patient/all-data",
                      JSON.stringify({
                        success: true,
                        message: "Bookings retrieved successfully.",
                        bookings: bookingsWithDetails,
                      })
                    );
                } catch (error) {
                  console.error("Error processing clinic message:", error);

                  await mqttHandler.publish(
                    "pearl-fix/booking/patient/all-data",
                    JSON.stringify({ success: false, message: "Server error. Could not retrieve clinic details." })
                  );
                }
              });
            }
          } catch (error) {
            console.error("Error processing patient message:", error);

            await mqttHandler.publish(
              "pearl-fix/booking/patient/all-data",
              JSON.stringify({ success: false, message: "Server error. Could not process patient data." })
            );
          }
        });
      } catch (error) {
        console.error("Error processing email message:", error);

        await mqttHandler.publish(
          "pearl-fix/booking/patient/all-data",
          JSON.stringify({ success: false, message: "Server error. Could not process email data." })
        );
      }
    });
  } catch (error) {
    console.error("Error connecting to MQTT broker:", error);
  }
})();


// GET BOOKINGS FOR DENTIST
(async () => {
  try {
    await mqttHandler.connect();
    console.log("Connected to MQTT broker.");

    await mqttHandler.subscribe("pearl-fix/booking/dentist/email", async (msg) => {
      console.log("Received message on 'pearl-fix/booking/dentist/email':", msg.toString());

      try {
        const receivedDentistEmail = JSON.parse(msg.toString());
        const dentistEmail = receivedDentistEmail.dentistEmail;
        console.log("Dentist email:", dentistEmail);

        if (!dentistEmail) {
          const errorMessage = "Missing dentistEmail in request body.";
          console.error(errorMessage);

          await mqttHandler.publish(
            "pearl-fix/booking/dentist/all-data",
            JSON.stringify({ success: false, message: errorMessage })
          );
          return;
        }

        await mqttHandler.publish(
          "pearl-fix/booking/find/dentist-id",
          JSON.stringify({ email: dentistEmail })
        );
        console.log(`Published dentist email to "pearl-fix/booking/find/dentist-id": ${dentistEmail}`);

        await mqttHandler.subscribe("pearl-fix/booking/find/dentist-email", async (msg) => {
          console.log("Received message on 'pearl-fix/booking/find/dentist-email':", msg.toString());

          try {
            const receivedMessage = JSON.parse(msg.toString());
            console.log("Message received on 'pearl-fix/booking/find/dentist-email:", receivedMessage);

            if (!receivedMessage) {
              const errorMessage = "No message received from MQTT subscription.";
              console.error(errorMessage);

              await mqttHandler.publish(
                "pearl-fix/booking/dentist/all-data",
                JSON.stringify({ success: false, message: errorMessage })
              );
              return;
            }

            const dentistIdFromMQTT = receivedMessage.dentistId
            console.log("Dentist ID from MQTT:", dentistIdFromMQTT);

            // Fetch bookings for the patient
            const bookings = await Booking.find({ dentistId: dentistIdFromMQTT }).select(
              "-availabilityId -status -dentistId -updatedAt -createdAt -__v"
            );
            console.log("Bookings found:", bookings);

            if (!bookings || bookings.length === 0) {
              const errorMessage = "No bookings found for the specified dentist.";
              console.error(errorMessage);

              await mqttHandler.publish(
                "pearl-fix/booking/dentist/all-data",
                JSON.stringify({ success: false, message: errorMessage })
              );
              return;
            }

            const bookingsWithDetails: any[] = []; // Collect all processed bookings

            // Process each booking to get clinic details
            for (const booking of bookings) {
              const patientId = booking.patientId;

              // Publish patientId to retrieve patient details
              await mqttHandler.publish(
                "pearl-fix/booking/find/patient-id",
                JSON.stringify({ patientId })
              );
              console.log(`Published dentistId to "pearl-fix/booking/find/clinic": ${patientId}`);

              await mqttHandler.subscribe("pearl-fix/booking/patient-email", async (msg) => {
                console.log("Received message on 'pearl-fix/booking/patient-email':", msg.toString());

                try {
                  const message = JSON.parse(msg.toString());
                  console.log("Message received on 'pearl-fix/booking/patient':", message);

                  const receivedPatient = message.patient;
                  console.log(receivedPatient);
                  if (!receivedPatient) {
                    const errorMessage = "Patient not found from MQTT data.";
                    console.error(errorMessage);

                    await mqttHandler.publish(
                      "pearl-fix/booking/dentist/all-data",
                      JSON.stringify({ success: false, message: errorMessage })
                    );
                    return;
                  }

                  const bookingWitPatientDetails = {
                    patientName: receivedPatient.name,
                    patientEmail: receivedPatient.email,
                    ...booking.toObject(),
                  };
                  console.log("Booking with patient details:", bookingWitPatientDetails);

                  // Add processed booking to the collection
                  bookingsWithDetails.push(bookingWitPatientDetails);

                  // If all bookings are processed, send them in a single message
                    console.log("All bookings processed successfully:", bookingsWithDetails);

                    await mqttHandler.publish(
                      "pearl-fix/booking/dentist/all-data",
                      JSON.stringify({
                        success: true,
                        message: "Bookings retrieved successfully.",
                        bookings: bookingsWithDetails,
                      })
                    );
                } catch (error) {
                  console.error("Error processing patient message:", error);

                  await mqttHandler.publish(
                    "pearl-fix/booking/dentist/all-data",
                    JSON.stringify({ success: false, message: "Server error. Could not retrieve clinic details." })
                  );
                }
              });
            }
          } catch (error) {
            console.error("Error processing patient message:", error);

            await mqttHandler.publish(
              "pearl-fix/booking/dentist/all-data",
              JSON.stringify({ success: false, message: "Server error. Could not process patient data." })
            );
          }
        });
      } catch (error) {
        console.error("Error processing email message:", error);

        await mqttHandler.publish(
          "pearl-fix/booking/dentist/all-data",
          JSON.stringify({ success: false, message: "Server error. Could not process email data." })
        );
      }
    });
  } catch (error) {
    console.error("Error connecting to MQTT broker:", error);
  }
})();



// CREATE BOOKING METHOD FOR PATIENTS
(async () => {
  try {
    await mqttHandler.connect();
    console.log("Connected to MQTT broker.");

    await mqttHandler.subscribe("pearl-fix/booking/create", async (msg) => {
      console.log("Received message on 'pearl-fix/booking/create':", msg.toString());

      try {
        const bookingData = JSON.parse(msg.toString());
        console.log(bookingData);

        if (!bookingData.dentistId || !bookingData.patientEmail || !bookingData.timeSlot) {
          console.error("Invalid booking data received:", bookingData);
          return;
        }

        const { dentistId, patientEmail, timeSlot } = bookingData;

        if (!dentistId || !patientEmail || !timeSlot?.start || !timeSlot?.end) {
          console.error("Missing required fields");

          // Publish failure message to the topic
          await mqttHandler.publish(
            "pearl-fix/booking/create/authenticate",
            JSON.stringify({ success: false, message: "Missing required fields" })
          );
          return;
        }

        await mqttHandler.publish(
          "pearl-fix/booking/create/patient/email/test",
          JSON.stringify({ email: patientEmail })
        );
        console.log(`Published patient email to "pearl-fix/booking/create/patient/email": ${patientEmail}`);

        await mqttHandler.subscribe("pearl-fix/booking/create/patient", async (msg) => {
          try {
            const patientData = JSON.parse(msg.toString());
            console.log("Message received on 'pearl-fix/booking/create/patient':", patientData);

            const receivedPatient = patientData.patient;
            if (!receivedPatient?._id) {
              console.error("Patient not found from MQTT data.");

              // Publish failure message to the topic
              await mqttHandler.publish(
                "pearl-fix/booking/create/authenticate",
                JSON.stringify({ success: false, message: "Patient not found from MQTT data." })
              );
              return;
            }

            const patientIdFromMQTT = receivedPatient._id;

            await mqttHandler.publish(
              "pearl-fix/booking/find/dentist/email",
              JSON.stringify({ dentistId })
            );
            console.log(`Published dentistId to "pearl-fix/booking/find/dentist/email": ${dentistId}`);

            await mqttHandler.subscribe("pearl-fix/booking/found/dentist/email", async (msg) => {
              try {
                const dentistData = JSON.parse(msg.toString());
                console.log("Message received on 'pearl-fix/booking/found/dentist/email':", dentistData);

                const dentistEmail = dentistData.dentistEmail;
                if (!dentistEmail) {
                  console.error("Dentist email not found.");

                  // Publish failure message to the topic
                  await mqttHandler.publish(
                    "pearl-fix/booking/create/authenticate",
                    JSON.stringify({ success: false, message: "Dentist email not found." })
                  );
                  return;
                }

                console.log("Received dentist email:", dentistEmail);

                // Check availability for the selected dentist and time slot
                const availability = await Availability.findOne({
                  dentist: dentistId,
                  "timeSlots.start": { $lte: new Date(timeSlot.start) },
                  "timeSlots.end": { $gte: new Date(timeSlot.end) },
                  "timeSlots.status": "available",
                });

                if (!availability) {
                  console.error("The selected time slot is unavailable.");

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
                  console.error("The selected time slot is unavailable.");

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
                  clinicId: availability.clinicId,
                  availabilityId: availability._id,
                  timeSlot,
                  status: "booked",
                });

                await booking.save();

                availability.timeSlots[slotIndex].status = "booked";
                await availability.save();

                console.log("Booking created successfully:", booking);

                // Send confirmation email to the patient
                const patientName = receivedPatient.name;
                await sendEmailConfirmation(
                  patientEmail,
                  patientName,
                  timeSlot,
                  "Clinic",
                  "clinicAddress",
                  dentistEmail
                );

                decrementAvailability(1); // Increase by 1 for the cancellation

                console.log(`Booking confirmation email sent to: ${patientEmail}`);

                // Publish success message to the topic
                await mqttHandler.publish(
                  "pearl-fix/booking/create/authenticate",
                  JSON.stringify({ success: true, message: "Booking created successfully." })
                );
              } catch (error) {
                console.error("Error processing dentist email message:", error);

                // Publish failure message to the topic
                await mqttHandler.publish(
                  "pearl-fix/booking/create/authenticate",
                  JSON.stringify({ success: false, message: "Server error" })
                );
              }
            });
          } catch (error) {
            console.error("Error processing patient message:", error);
          }
        });
      } catch (error) {
        console.error("Error processing booking creation message:", error);
      }
    });
  } catch (error) {
    console.error("Error connecting to MQTT broker:", error);
  }
})();


// Helper method to continuously listen for booking data
/*const listenForBookingData = async (): Promise<void> => {
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
}; */





// In-memory cache to store patient and dentist data
const cache = {
  patient: null as any, // Will hold patient data
  dentist: null as any, // Will hold dentist data
};

export const createBooking: RequestHandler = async (req, res): Promise<void> => {
  const { dentistId, patientEmail, timeSlot } = req.body;

  try {
    await mqttHandler.connect();

    // Check if we already have the patient and dentist data in the cache
    let cachedDentist = cache.dentist;
    let cachedPatient = cache.patient;

    if (!cachedDentist || !cachedPatient) {
      // If no cached data, proceed to fetch it via MQTT

      if (!dentistId || !patientEmail || !timeSlot?.start || !timeSlot?.end) {
        res.status(400).json({ message: "Missing required fields" });
        await mqttHandler.publishWithIsolation(
          "pearl-fix/booking/create/authenticate",
          JSON.stringify({ success: false, message: "Missing required fields" })
        );
        return;
      }

      // Publish the patient email to MQTT
      await mqttHandler.publishWithIsolation(
        "pearl-fix/booking/create/patient/email",
        JSON.stringify({ email: patientEmail })
      );
      console.log(`Published patient email: ${patientEmail}`);

      // Wait for patient data
      let receivedPatient: any = null;
      await new Promise((resolve, reject) => {
        mqttHandler.subscribeWithIsolation("pearl-fix/booking/create/patient", (msg, channel) => {
          try {
            const message = JSON.parse(msg.content.toString());
            if (message.patient) {
              receivedPatient = message.patient;
              console.log("Patient data received:", receivedPatient);
              cache.patient = receivedPatient;
              console.log("Cache updated with patient:", cache.patient);
              console.log("Patient id", cache.patient._id);

      if (!cache.patient) {
        res.status(500).json({ message: "Patient data is missing in the cache" });
        return;
      }
      
      if (!cache.patient._id) {
        res.status(500).json({ message: "Patient ID is missing in cached data" });
        return;
      }

              resolve(true); // Resolve when patient data is received
            }
          } catch (error) {
            console.error("Error processing patient message:", error);
          } finally {
            channel.ack(msg); // Acknowledge the message
          }
        });

        // Timeout for waiting for patient data
        setTimeout(() => reject(new Error("Timeout waiting for patient data")), 10000);
      });

      

      // After receiving patient data, subscribe for the dentist email
      let receivedDentistEmail: string | null = null;
      await new Promise((resolve, reject) => {
        mqttHandler.subscribeWithIsolation("pearl-fix/booking/found/dentist/email", (msg, channel) => {
          try {
            const message = JSON.parse(msg.content.toString());
            if (message.dentistEmail) {
              receivedDentistEmail = message.dentistEmail;
              console.log("Dentist email received:", receivedDentistEmail);
              cache.dentist = { email: receivedDentistEmail }; // Cache dentist email
              resolve(true); // Resolve when dentist email is received
            }
          } catch (error) {
            console.error("Error processing dentist email message:", error);
          } finally {
            channel.ack(msg); // Acknowledge the message
          }
        });

        // Publish to get the dentist email based on dentistId
        mqttHandler.publishWithIsolation("pearl-fix/booking/find/dentist/email", JSON.stringify({ dentistId }));

        // Timeout for dentist email data
        setTimeout(() => reject(new Error("Timeout waiting for dentist email")), 10000);
      });

      if (!receivedDentistEmail) {
        res.status(404).json({ message: "Dentist email not found." });
        await mqttHandler.publishWithIsolation(
          "pearl-fix/booking/create/authenticate",
          JSON.stringify({ success: false, message: "Dentist email not found." })
        );
        return;
      }

      console.log("Using cached dentist email:", receivedDentistEmail);
    } else {
      // If the data is cached, just use it directly
      console.log("Using cached patient data:", cachedPatient);
      console.log("Using cached dentist data:", cachedDentist);
    }

    // Proceed with the booking creation logic
    const availability = await Availability.findOne({
      dentist: dentistId,
      "timeSlots.start": { $lte: new Date(timeSlot.start) }, // Check if timeSlot start is before or equal
      "timeSlots.end": { $gte: new Date(timeSlot.end) }, // Check if timeSlot end is after or equal
      "timeSlots.status": "available",
    });

    if (!availability) {
      res.status(400).json({ message: "The selected time slot is unavailable." });
      await mqttHandler.publishWithIsolation(
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
      await mqttHandler.publishWithIsolation(
        "pearl-fix/booking/create/authenticate",
        JSON.stringify({ success: false, message: "The selected time slot is unavailable." })
      );
      return;
    }

    // Create the booking
    const booking = new Booking({
      dentistId,
      patientId: cache.patient._id, // Use cached patient ID
      clinicId: availability.clinicId, // Assuming clinicId is available in Availability schema
      availabilityId: availability._id,
      timeSlot,
      status: "booked",
    });

    await booking.save();
    availability.timeSlots[slotIndex].status = "booked";
    await availability.save();

    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });

    // Send the email confirmation to the patient
    await sendEmailConfirmation(patientEmail, cache.patient.name, timeSlot, "CLinic", "clinicAddress", cache.dentist.email);
    console.log(`Booking confirmation email sent to: ${patientEmail}`);

    // Publish success message to the topic
    await mqttHandler.publishWithIsolation(
      "pearl-fix/booking/create/authenticate",
      JSON.stringify({ success: true, message: "Booking created successfully." })
    );
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ message: "Server error" });
    await mqttHandler.publishWithIsolation(
      "pearl-fix/booking/create/authenticate",
      JSON.stringify({ success: false, message: "Server error" })
    );
  }
};






export const createBookings: RequestHandler = async (req, res): Promise<void> => {
  try {
    await mqttHandler.connect();
    console.log("Connected to MQTT broker");

    const { clinicId, patientId, timeSlot, dentistId, availabilityId } = req.body;

    // Validate required fields
    if (!clinicId || !patientId || !timeSlot || !dentistId || !availabilityId) {
      res.status(400).json({ message: "Missing required fields." });
      return;
    }

    const { start, end } = timeSlot;

    if (!start || !end) {
      res.status(400).json({ message: "Invalid timeSlot format." });
      return;
    }

    // Parse and validate timeSlot
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
      res.status(400).json({ message: "Invalid timeSlot range." });
      return;
    }

    // Create the booking document
    const booking = new Booking({
      dentistId,
      patientId,
      availabilityId,
      timeSlot: {
        start: startDate,
        end: endDate,
      },
      clinicId,
      status: "booked",
    });

    await booking.save();

    // Publish success message to MQTT broker
    await mqttHandler.publish(
      "pearl-fix/bookings/patient/create/success",
      JSON.stringify({
        message: "Booking created successfully.",
        booking: {
          id: booking._id,
          clinicId,
          patientId,
          dentistId,
          timeSlot,
          availabilityId,
        },
      })
    );

    console.log("Booking created:", booking);

    res.status(201).json({ message: "Booking created successfully.", booking });
  } catch (error) {
    console.error("Error creating booking:", error);

    // Publish error message to MQTT broker
    await mqttHandler.publish(
      "pearl-fix/bookings/patient/create/error",
      JSON.stringify({
        message: "Error creating booking.",
        error: error.message,
      })
    );

    res.status(500).json({ message: "Server error." });
  }
};

const listenForPatientsBookings = async (): Promise<void> => {
  try {
    await mqttHandler.connect();

    mqttHandler.subscribe("pearl-fix/booking/patient/email", async (msg) => {
      try {
        const patientEmail = JSON.parse(msg.toString());
        console.log("Received patient email:", patientEmail);

        // Call createBooking with a mock req and res
        const mockReq = {
          body: patientEmail,
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

        await getBookingsForPatient(mockReq, mockRes, mockNext);
      } catch (error) {
        console.error("Error processing booking data:", error);
      }
    });

    console.log("Listening for messages on 'pearl-fix/booking/patient/email'...");
  } catch (error) {
    console.error("Error setting up MQTT listener:", error);
  }
};

// Postman `getBookingsForPatient` method
export const getBookingsForPatient: RequestHandler = async (req, res) => {
  const { patientEmail } = req.body;

  try {
    if (!patientEmail) {
      const errorMessage = "Missing patientEmail in request body.";
      res.status(400).json({ message: errorMessage });

      await mqttHandler.publish(
        "pearl-fix/booking/patient/all-data",
        JSON.stringify({ success: false, message: errorMessage })
      );
      return;
    }

    // Publish patient email to MQTT
    await mqttHandler.publish(
      "pearl-fix/booking/create/patient/email/test",
      JSON.stringify({ email: patientEmail })
    );
    console.log(`Published patient email to "pearl-fix/booking/create/patient/email": ${patientEmail}`);

    const receivedPatient: any = await new Promise((resolve, reject) => {
      mqttHandler.subscribe("pearl-fix/booking/create/patient/test", (msg) => {
        console.log("Received message on 'pearl-fix/booking/create/patient':", msg.toString());
  
        try {
          const parsedMessage = JSON.parse(msg.toString());
          resolve(parsedMessage); // Resolve with parsed message
        } catch (error) {
          reject(new Error("Failed to parse MQTT message."));
        }
      });
  
      // Optional: Add a timeout to handle cases where no message is received
      setTimeout(() => {
        reject(new Error("Timeout: No message received on 'pearl-fix/booking/create/patient'."));
      }, 10000); // Timeout after 10 seconds
    });

    if (!receivedPatient) {
      const errorMessage = "No patient received from MQTT subscription.";
      res.status(404).json({ message: errorMessage });

      await mqttHandler.publish(
        "pearl-fix/booking/patient/all-data",
        JSON.stringify({ success: false, message: errorMessage })
      );
      return;
    }

    const patientIdFromMQTT = receivedPatient.patient._id;
    console.log("Patient ID from MQTT:", patientIdFromMQTT);

    // Fetch bookings for the patient
    const bookings = await Booking.find({ patientId: patientIdFromMQTT }).select(
      "-availabilityId -status -patientId -updatedAt -createdAt -__v"
    );
    console.log("Bookings found:", bookings);

    if (!bookings || bookings.length === 0) {
      const errorMessage = "No bookings found for the specified patient.";
      res.status(404).json({ message: errorMessage });

      await mqttHandler.publish(
        "pearl-fix/booking/patient/all-data",
        JSON.stringify({ success: false, message: errorMessage })
      );
      return;
    }

    // Process each booking to get clinic details
    const bookingsWithClinicDetails = await Promise.all(
      bookings.map(async (booking) => {
        const dentistId = booking.dentistId;

        // Publish dentistId to retrieve clinic details
        await mqttHandler.publish(
          "pearl-fix/booking/find/clinic",
          JSON.stringify({ dentistId })
        );
        console.log(`Published dentistId to "pearl-fix/booking/find/clinic": ${dentistId}`);

        const clinic: any = await new Promise((resolve, reject) => {
          mqttHandler.subscribe("pearl-fix/booking/clinic", (msg) => {
            console.log("Received message on 'pearl-fix/booking/clinic':", msg.toString());
      
            try {
              const parsedMessage = JSON.parse(msg.toString());
              resolve(parsedMessage); // Resolve with parsed message
            } catch (error) {
              reject(new Error("Failed to parse MQTT message."));
            }
          });
      
          // Optional: Add a timeout to handle cases where no message is received
          setTimeout(() => {
            reject(new Error("Timeout: No message received on 'pearl-fix/booking/create/patient'."));
          }, 10000); // Timeout after 10 seconds
        });
 

        if (!clinic?.clinic?._id) {
          throw new Error("Clinic not found from MQTT data.");
        }

        return {
          clinicName: clinic.clinic.clinicName,
          clinicAddress: clinic.clinic.address,
          ...booking.toObject(),
        };
      })
    );

    // Send response and publish success
    res.status(200).json({
      message: "Bookings retrieved successfully.",
      bookings: bookingsWithClinicDetails,
    });

    await mqttHandler.publish(
      "pearl-fix/booking/patient/all-data",
      JSON.stringify({
        success: true,
        message: "Bookings retrieved successfully.",
        bookings: bookingsWithClinicDetails,
      })
    );
  } catch (error) {
    console.error("Error retrieving bookings for patient:", error);
    res.status(500).json({ message: "Server error. Could not retrieve bookings." });

    await mqttHandler.publish(
      "pearl-fix/booking/patient/all-data",
      JSON.stringify({ success: false, message: "Server error. Could not retrieve bookings." })
    );
  }
};


const listenForPatientsCancelling = async (): Promise<void> => {
  try {
    await mqttHandler.connect();

    mqttHandler.subscribe("pearl-fix/booking/patient/cancel", async (msg) => {
      try {
        const cancelData = JSON.parse(msg.toString());
        console.log("Received cancel data:", cancelData);

        // Validate required fields
        if (!cancelData.bookingId || !cancelData.patientEmail) {
          console.error("Invalid canceling data received:", cancelData);
          return;
        }

        // Call createBooking with a mock req and res
        const mockReq = {
          body: cancelData,
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

        await cancelBookingByPatient(mockReq, mockRes, mockNext);
      } catch (error) {
        console.error("Error processing booking data:", error);
      }
    });

    console.log("Listening for messages on 'pearl-fix/booking/patient/cancel'...");
  } catch (error) {
    console.error("Error setting up MQTT listener:", error);
  }
};

// Patient cancels booking
export const cancelBookingByPatient: RequestHandler = async (req, res): Promise<void> => {
  const { bookingId, patientEmail } = req.body;  // Retrieve bookingId and patientEmail from req.body

  try {
    // Check if patientEmail is provided
    if (!patientEmail) {
      res.status(400).json({ message: "Missing patientEmail in request body." });

      // Publish failure status to the topic 'pearl-fix/booking/patient/cancel/authenticate'
      await mqttHandler.publish(
        "pearl-fix/booking/patient/cancel/authenticate",
        JSON.stringify({
          success: false,
          message: "Missing patientEmail in request body.",
        })
      );
      return;
    }

    // Publish patient email to retrieve patient ID
    await mqttHandler.publish(
      "pearl-fix/booking/create/patient/email/test",
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
      }, 30000);

      mqttHandler.subscribe("pearl-fix/booking/create/patient/test", (msg) => {
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
    

    const patientIdFromMQTT = receivedPatient._id;  // Retrieve patient ID from MQTT response

    // Find booking by ID
    const booking = await Booking.findOne({ _id: new mongoose.Types.ObjectId(bookingId) });

    console.log("Found Booking:", booking);
    if (!booking) {
      res.status(404).json({ message: "Booking not found." });

      // Publish failure status to the topic 'pearl-fix/booking/patient/cancel/authenticate'
      await mqttHandler.publish(
        "pearl-fix/booking/patient/cancel/authenticate",
        JSON.stringify({
          success: false,
          message: "Booking not found.",
        })
      );
      return;
    }

    if (String(booking.patientId) !== String(patientIdFromMQTT)) {
      res.status(403).json({ message: "You can only cancel your own bookings." });

      // Publish failure status to the topic 'pearl-fix/booking/patient/cancel/authenticate'
      await mqttHandler.publish(
        "pearl-fix/booking/patient/cancel/authenticate",
        JSON.stringify({
          success: false,
          message: "You can only cancel your own bookings.",
        })
      );
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
    const patientEmailFromMQTT: string = await new Promise((resolve, reject) => {
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

    console.log("Successfully received emails:", { dentistEmail, patientEmailFromMQTT });

    // Convert timeSlot start and end from Date to string
    const timeSlot = {
      start: booking.timeSlot.start.toISOString(),
      end: booking.timeSlot.end.toISOString(),
    };

    // Send cancellation email to both patient and dentist
    await sendCancellationEmail(patientEmailFromMQTT, timeSlot, dentistEmail);

    // Respond with success and include bookingId
    res.status(200).json({
      message: "Booking canceled successfully.",
    });

    incrementAvailability(1); // Increase by 1 for the cancellation

    // Publish success status to the topic 'pearl-fix/booking/patient/cancel/authenticate'
    await mqttHandler.publish(
      "pearl-fix/booking/patient/cancel/authenticate",
      JSON.stringify({
        success: true,
        message: "Booking canceled successfully.",
      })
    );
  } catch (error) {
    console.error("Error in cancelBookingByPatient:", error);
    res.status(500).json({ message: "Server error." });

    // Publish failure status to the topic 'pearl-fix/booking/patient/cancel/authenticate'
    await mqttHandler.publish(
      "pearl-fix/booking/patient/cancel/authenticate",
      JSON.stringify({
        success: false,
        message: "Server error. Could not process cancellation.",
      })
    );
  } finally {
    mqttHandler.close();
  }
};


export const getBookingsForDentist: RequestHandler = async (req, res) => {
  const { dentistEmail } = req.body;

  try {
    // Check if dentistEmail is provided
    if (!dentistEmail) {
      res.status(400).json({ message: "Missing dentistEmail in request body." });

      // Publish failure status to the topic 'pearl-fix/booking/dentist/all-data'
      await mqttHandler.publish(
        "pearl-fix/booking/dentist/all-data",
        JSON.stringify({
          success: false,
          message: "Missing dentistEmail in request body.",
        })
      );
      return;
    }

    // Publish dentist email to retrieve dentist ID
    await mqttHandler.publish(
      "pearl-fix/booking/find/dentist-id",
      JSON.stringify({ email: dentistEmail })
    );
    console.log(`Published dentist email to "pearl-fix/booking/find/dentist-id": ${dentistEmail}`);

    // Retrieve dentist ID from MQTT subscription
    const dentistIdFromMQTT: any = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("No dentistId received from MQTT subscription")), 10000);

      mqttHandler.subscribe("pearl-fix/booking/find/dentist-email", (msg) => {
        try {
          const message = JSON.parse(msg.toString());
          console.log("Message received on 'pearl-fix/booking/find/dentist-email':", message);
          if (message.dentistId) {
            clearTimeout(timeout);
            resolve(message.dentistId);
          }
        } catch (error) {
          console.error("Error processing dentist message:", error);
        }
      });
    });

    // Fetch bookings for the dentist
    const bookings = await Booking.find({ dentistId: dentistIdFromMQTT }).select(
      "-availabilityId -status -dentistId -updatedAt -createdAt -__v"
    );

    if (!bookings || bookings.length === 0) {
      res.status(404).json({ message: "No bookings found for the specified dentist." });

      // Publish failure status to the topic 'pearl-fix/booking/dentist/all-data'
      await mqttHandler.publish(
        "pearl-fix/booking/dentist/all-data",
        JSON.stringify({
          success: false,
          message: "No bookings found for the specified dentist.",
        })
      );
      return;
    }

    // Process each booking to get patient details
    const bookingsWithPatientDetails = await Promise.all(
      bookings.map(async (booking) => {
        const { patientId } = booking;

        if (!patientId) {
          console.log(`Booking ${booking._id} has no associated patient.`);
          return { ...booking.toObject(), patientName: null, patientEmail: null };
        }

        // Publish patientId to retrieve patient details
        await mqttHandler.publish(
          "pearl-fix/booking/find/patient-id",
          JSON.stringify({ patientId })
        );
        console.log(`Published patientId to "pearl-fix/booking/find/patient": ${patientId}`);

        // Retrieve patient details from MQTT subscription
        const patient: any = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("No patient received from MQTT subscription")), 10000);

          mqttHandler.subscribe("pearl-fix/booking/patient-email", (msg) => {
            try {
              const message = JSON.parse(msg.toString());
              console.log("Message received on 'pearl-fix/booking/patient':", message);
              if (message.patient) {
                clearTimeout(timeout);
                resolve(message.patient);
              }
            } catch (error) {
              console.error("Error processing patient message:", error);
            }
          });
        });

        return {
          ...booking.toObject(),
          patientName: patient.name,
          patientEmail: patient.email,
        };
      })
    );

    // Respond with the bookings with patient details
    res.status(200).json({
      message: "Bookings retrieved successfully.",
      bookings: bookingsWithPatientDetails,
    });

    // Publish success status and include bookings data to the topic 'pearl-fix/booking/dentist/all-data'
    await mqttHandler.publish(
      "pearl-fix/booking/dentist/all-data",
      JSON.stringify({
        success: true,
        message: "Bookings retrieved successfully.",
        bookings: bookingsWithPatientDetails,
      })
    );
  } catch (error) {
    console.error("Error retrieving bookings for dentist:", error);
    res.status(500).json({ message: "Server error. Could not retrieve bookings." });

    // Publish failure status to the topic 'pearl-fix/booking/dentist/all-data'
    await mqttHandler.publish(
      "pearl-fix/booking/dentist/all-data",
      JSON.stringify({
        success: false,
        message: "Server error. Could not retrieve bookings.",
      })
    );
  }
};

const listenForDentistsCancelling = async (): Promise<void> => {
  try {
    await mqttHandler.connect();

    mqttHandler.subscribe("pearl-fix/booking/dentist/cancel", async (msg) => {
      try {
        const cancelData = JSON.parse(msg.toString());
        console.log("Received cancel data:", cancelData);

        // Validate required fields
        if (!cancelData.bookingId || !cancelData.dentistEmail) {
          console.error("Invalid canceling data received:", cancelData);
          return;
        }

        // Call createBooking with a mock req and res
        const mockReq = {
          body: cancelData,
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

        await cancelBookingByDentist(mockReq, mockRes, mockNext);
      } catch (error) {
        console.error("Error processing booking data:", error);
      }
    });

    console.log("Listening for messages on 'pearl-fix/booking/dentist/cancel'...");
  } catch (error) {
    console.error("Error setting up MQTT listener:", error);
  }
};


// Dentist cancels a booking
export const cancelBookingByDentist: RequestHandler = async (req, res): Promise<void> => {
  const { bookingId, dentistEmail } = req.body; // Retrieve bookingId and dentistEmail from req.body

  try {
    // Check if dentistEmail is provided
    if (!dentistEmail) {
      res.status(400).json({ message: "Missing dentistEmail in request body." });

      // Publish failure status to the topic 'pearl-fix/booking/dentist/all-data'
      await mqttHandler.publish(
        "pearl-fix/booking/dentist/cancel/authenticate",
        JSON.stringify({
          success: false,
          message: "Missing dentistEmail in request body.",
        })
      );
      return;
    }

    // Publish dentist email to retrieve dentist ID
    await mqttHandler.publish(
      "pearl-fix/booking/find/dentist-id",
      JSON.stringify({ email: dentistEmail })
    );
    console.log(`Published dentist email to "pearl-fix/booking/find/dentist-id": ${dentistEmail}`);

    // Retrieve dentist ID from MQTT subscription
    const dentistIdFromMQTT: string = await new Promise((resolve, reject) => {
      // Set a longer timeout if the broker is slow
      const timeout = setTimeout(() => {
        console.error("Timeout: No dentistId received from MQTT subscription");
        reject(new Error("No dentistId received from MQTT subscription"));
      }, 30000); // Increase timeout to 15 seconds if necessary
    
      mqttHandler.subscribe("pearl-fix/booking/find/dentist-email", (msg) => {
        try {
          console.log("Message received on 'pearl-fix/booking/find/dentist-email':", msg.toString());
          const message = JSON.parse(msg.toString());
    
          // Validate the message
          if (message.dentistId) {
            console.log("Resolved dentistId from MQTT:", message.dentistId);
            clearTimeout(timeout);
            resolve(message.dentistId); // Resolve the promise with the dentistId
          } else {
            console.error("Received message missing dentistId:", message);
          }
        } catch (error) {
          console.error("Error processing dentist message:", error);
        }
      });
    });
    

    // Fetch the booking using the provided bookingId
    const booking = await Booking.findOne({ _id: new mongoose.Types.ObjectId(bookingId) });

    console.log("Found Booking:", booking);
    if (!booking) {
      res.status(404).json({ message: "Booking not found." });
      await mqttHandler.publish(
        "pearl-fix/booking/dentist/cancel/authenticate",
        JSON.stringify({
          success: false,
          message: "Booking not found.",
        })
      );
      return;
    }

    // Verify that the booking belongs to the retrieved dentistId
    if (String(booking.dentistId) !== String(dentistIdFromMQTT)) {
      res.status(403).json({ message: "You can only cancel your own bookings." });
      await mqttHandler.publish(
        "pearl-fix/booking/dentist/cancel/authenticate",
        JSON.stringify({
          success: false,
          message: "You can only cancel your own bookings.",
        })
      );
      return;
    }

    // Delete the booking
    await Booking.findByIdAndDelete(bookingId);

    // Update the availability to mark the time slot as available
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

    // Subscribe and retrieve patient's email
    const patientEmail: string = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Patient email not received within timeout")), 10000);

      mqttHandler.subscribe("pearl-fix/booking/canceled/patient-email", (msg) => {
        try {
          const { email: receivedEmail } = JSON.parse(msg.toString());
          console.log("Received patient email:", receivedEmail);
          clearTimeout(timeout);
          resolve(receivedEmail);
        } catch (error) {
          console.error("Error processing patient email message:", error);
        }
      });
    });

    console.log("Successfully received patient email:", patientEmail);

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

    // Publish success status to the topic 'pearl-fix/booking/patient/cancel/authenticate'
    await mqttHandler.publish(
      "pearl-fix/booking/dentist/cancel/authenticate",
      JSON.stringify({
        success: true,
        message: "Booking canceled successfully.",
      })
    );

    // Publish dentist updates
    await mqttHandler.publish(
      "pearl-fix/booking/update/dentist",
      JSON.stringify({
        dentistId: booking.dentistId,
        availability: {
          _id: booking.availabilityId,
        },
        booking: {
          _id: booking._id,
        },
      })
    );
    console.log(`Published dentist, availability, and canceled booking to "pearl-fix/booking/update/dentist"`);

    // Publish patient updates
    await mqttHandler.publish(
      "pearl-fix/booking/update/patient",
      JSON.stringify({
        patientId: booking.patientId,
        booking: {
          _id: booking._id,
        },
      })
    );
    console.log(`Published patient and canceled booking to "pearl-fix/booking/update/patient"`);

    incrementAvailability(1); // Increase by 1 for the cancellation

  } catch (error) {
    console.error("Error in cancelBookingByDentist:", error);
    await mqttHandler.publish(
      "pearl-fix/booking/dentist/cancel/authenticate",
      JSON.stringify({
        success: false,
        message: "Server error. Could not process cancellation.",
      })
    );
    res.status(500).json({ message: "Server error." });
  } finally {
    mqttHandler.close();
  }
};


// Start listening for bookings
//listenForBookingData();

listenForPatientsCancelling();


listenForDentistsCancelling();
