import { RequestHandler } from "express";
import Availability from "../models/Availability";
import { MQTTHandler } from "../mqtt/MqttHandler";
import mongoose from "mongoose";

// Initialize the MQTT handler
const mqttHandler = new MQTTHandler(process.env.CLOUDAMQP_URL!);

(async () => {
  try {
    await mqttHandler.connect();

    // Subscribe to the availability creation queue
    await mqttHandler.subscribe("pearl-fix/availability/set", async (msg) => {
      try {
        console.log("Message received on 'pearl-fix/availability/set':", msg);

        // Parse incoming message
        let parsedMessage;
        try {
          parsedMessage = JSON.parse(msg.toString());
        } catch (err) {
          console.error("Failed to parse availability message:", err);
          await mqttHandler.publish(
            "pearl-fix/availability/confirmation",
            JSON.stringify({ status: "failure", message: "Invalid message format" })
          );
          return;
        }

        // Extract message fields
        const { date, availableSlots, token } = parsedMessage;
        console.log(date, availableSlots, token);

        if (!date || !availableSlots || !token) {
          console.error("Missing required fields in message.");
          await mqttHandler.publish(
            "pearl-fix/availability/confirmation",
            JSON.stringify({ status: "failure", message: "Missing required fields" })
          );
          return;
        }

        await mqttHandler.publish("pearl-fix/authentication/verify-dentist", JSON.stringify({ token }));
        console.log(`Published token to 'pearl-fix/authentication/verify-dentist': ${token}`);

        // Wait for email from the verification topic
        const dentistEmail = await new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Timeout waiting for dentist verification email."));
          }, 30000);

          mqttHandler.subscribe("pearl-fix/authentication/verify-dentist/email", (emailMsg) => {
            try {
              const emailData = JSON.parse(emailMsg.toString());
              console.log("Message received on 'pearl-fix/authentication/verify-dentist/email':", emailData);

              if (emailData?.email) {
                clearTimeout(timeout); // Clear timeout once we get the email
                resolve(emailData.email);
              } else {
                reject(new Error("Invalid email received from verification topic."));
              }
            } catch (error) {
              console.error("Error parsing email verification message:", error);
              reject(error);
            }
          });
        });

        console.log(`Dentist email verified: ${dentistEmail}`);

        // Publish dentist email or ID to the topic
        await mqttHandler.publish(
          "pearl-fix/availability/create/email",
          JSON.stringify({ email: dentistEmail })
        );
        console.log(`Published successful message to "pearl-fix/availability/create/email": ${dentistEmail}`);

        // Collect dentist data from the subscription
        const receivedDentist = await new Promise<any>((resolve, reject) => {
          let dentistData: any = null;
          const timeout = setTimeout(() => {
            reject(new Error("No dentist received from MQTT subscription"));
          }, 10000);

          mqttHandler.subscribe("pearl-fix/availability/create/dentist", (msg) => {
            try {
              const message = JSON.parse(msg.toString());
              console.log("Message received on 'pearl-fix/availability/create/dentist':", message);

              if (message.dentist) {
                dentistData = message.dentist;
                clearTimeout(timeout); // Clear timeout as we got the data
                resolve(dentistData);
              }
            } catch (error) {
              console.error("Error processing dentist message:", error);
            }
          });
        });

        if (!receivedDentist?._id) {
          console.error("Dentist not found from MQTT data.");
          return;
        }

        const dentistId = receivedDentist._id;

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
                clinicData = message.clinic;
                clearTimeout(timeout);
                resolve(clinicData);
              }
            } catch (error) {
              console.error("Error processing clinic message:", error);
            }
          });
        });
    
        if (!clinic?._id) {
          console.error("Clinic not found from MQTT data.");
          await mqttHandler.publish(
            "pearl-fix/availability/error",
            JSON.stringify({ status: "failure", message: "Clinic not found from MQTT data." })
          );
          return;
        }
    
        const clinicIdFromMQTT = clinic._id;

        // Use the provided date for time slots
        const baseDate = new Date(date);

        // Convert timeSlots to proper Date objects with the correct date
        const formattedTimeSlots = availableSlots.map((slot: { start: string; end: string }) => {
          const startTimeParts = slot.start.split(":");
          const endTimeParts = slot.end.split(":");

          // Set the full date with start and end times
          const startDate = new Date(
            baseDate.setHours(parseInt(startTimeParts[0]), parseInt(startTimeParts[1]), 0, 0)
          );
          const endDate = new Date(
            baseDate.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0, 0)
          );

          return {
            start: startDate,
            end: endDate,
            status: "available",
          };
        });

        // Create availability document
        const availability = new Availability({
          dentist: dentistId,
          workDays: parsedMessage.workDays,
          timeSlots: formattedTimeSlots,
          clinicId: clinicIdFromMQTT,
        });

        // Save availability document to DB
        await availability.save();

        // Respond with the created availability and its ID
        console.log("Availability created:", availability);

        await mqttHandler.publish(
          "pearl-fix/availability/create/id",
          JSON.stringify({ id: availability.id, email: dentistEmail })
        );
        console.log(`Published availability ID: ${availability.id} to 'pearl-fix/availability/create/id'.`);

        mqttHandler.close();
      } catch (error) {
        console.error("Failed to initialize MQTT handler for availability:", error);
      }

      // Gracefully close MQTT handler on process termination
      process.on("SIGINT", async () => {
        try {
          console.log("SIGINT received, closing MQTTHandler connection.");
          await mqttHandler.close();
          process.exit(0);
        } catch (error) {
          console.error("Error closing MQTTHandler connection:", error);
          process.exit(1);
        }
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
  }
})();

export const createAvailability: RequestHandler = async (req, res): Promise<void> => {
  const { dentist, workDays, timeSlots, date } = req.body;

  try {
    await mqttHandler.connect();

    // Check if a valid dentist email or ID is provided
    if (!dentist || typeof dentist !== "string" || dentist.trim() === "") {
      console.error("No valid dentist provided.");
      res.status(400).json({ message: "No valid dentist provided in request." });
      return;
    }

    // Publish dentist email or ID to the topic
    await mqttHandler.publish(
      "pearl-fix/availability/create/email",
      JSON.stringify({ email: dentist })
    );
    console.log(`Published successful message to "pearl-fix/availability/create/email": ${dentist}`);

    // Collect dentist data from the subscription
    const receivedDentist: any = await new Promise((resolve, reject) => {
      let dentistData: any = null;
      const timeout = setTimeout(() => {
        reject(new Error("No dentist received from MQTT subscription"));
      }, 10000);

      mqttHandler.subscribe("pearl-fix/availability/create/dentist", (msg) => {
        try {
          const message = JSON.parse(msg.toString());
          console.log("Message received on 'pearl-fix/availability/create/dentist':", message);

          if (message.dentist) {
            dentistData = message.dentist;
            clearTimeout(timeout); // Clear timeout as we got the data
            resolve(dentistData);
          }
        } catch (error) {
          console.error("Error processing dentist message:", error);
        }
      });
    });

    if (!receivedDentist?._id) {
      res.status(404).json({ message: "Dentist not found from MQTT data." });
      return;
    }

    const dentistId = receivedDentist._id;

    // Use the provided date for time slots
    const baseDate = new Date(date);

    // Convert timeSlots to proper Date objects with the correct date
    const formattedTimeSlots = timeSlots.map((slot: { start: string; end: string }) => {
      const startTimeParts = slot.start.split(":");
      const endTimeParts = slot.end.split(":");

      // Set the full date with start and end times
      const startDate = new Date(
        baseDate.setHours(parseInt(startTimeParts[0]), parseInt(startTimeParts[1]), 0, 0)
      );
      const endDate = new Date(
        baseDate.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0, 0)
      );

      return {
        start: startDate,
        end: endDate,
        status: "available",
      };
    });

    // Create availability document
    const availability = new Availability({
      dentist: dentistId,
      workDays,
      timeSlots: formattedTimeSlots,
    });

    // Save availability document to DB
    await availability.save();

    // Respond with the created availability and its ID
    res.status(201).json({
      message: "Availability created successfully.",
      availability: {
        dentist: dentistId,
        workDays: availability.workDays,
        timeSlots: formattedTimeSlots,
      },
    });
    console.log("Availability created:", availability);

    await mqttHandler.publish(
      "pearl-fix/availability/create/id",
      JSON.stringify({ id: availability.id, email: dentist })
    );
    console.log(`Published availability ID: ${availability.id} to 'pearl-fix/availability/create/id'.`);

    mqttHandler.close();
  } catch (error) {
    console.error("Error creating availability:", error);
    res.status(500).json({ message: "Server error." });
  } finally {
    mqttHandler.close();
  }
};

export const getAvailability: RequestHandler = async (req, res): Promise<void> => {
  const { dentistId } = req.params;

  try {
    const availability = await Availability.findOne({ dentist: dentistId });

    if (!availability) {
      res.status(404).json({ message: "Availability not found" });
      return;
    }

    res.status(200).json({ availability });
  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const removeAvailability: RequestHandler = async (req, res): Promise<void> => {
  const { dentistId, timeSlotId } = req.params;

  try {
    await mqttHandler.connect();

    const availability = await Availability.findOne({ dentist: dentistId });

    if (!availability) {
      res.status(404).json({ message: "Availability not found" });
      return;
    }

    if (timeSlotId) {
      const timeSlotIndex = availability.timeSlots.findIndex(
        (slot) => slot._id.toString() === timeSlotId.toString()
      );

      if (timeSlotIndex === -1) {
        res.status(404).json({ message: "Time slot not found" });
        return;
      }

      availability.timeSlots.splice(timeSlotIndex, 1);

      if (availability.timeSlots.length === 0) {
        await availability.deleteOne();

        await mqttHandler.publish(
          "pearl-fix/availability/remove",
          JSON.stringify({ dentistId, availabilityId: null })
        );

        res.status(200).json({ message: "Availability removed successfully" });
        return;
      }

      await availability.save();
    } else {
      await availability.deleteOne();

      await mqttHandler.publish(
        "pearl-fix/availability/remove",
        JSON.stringify({ dentistId, availabilityId: null })
      );

      res.status(200).json({ message: "Availability removed successfully" });
      return;
    }

    await mqttHandler.publish(
      "pearl-fix/availability/remove",
      JSON.stringify({ dentistId, availabilityId: availability._id })
    );

    res.status(200).json({ message: "Time slot removed successfully" });
  } catch (error) {
    console.error("Error removing availability:", error);
    res.status(500).json({ message: "Server error", error });
  } finally {
    mqttHandler.close();
  }
};