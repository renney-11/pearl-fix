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

        let parsedMessage;
        try {
          parsedMessage = JSON.parse(msg);
        } catch (err) {
          console.error("Failed to parse availability message:", err);
          await mqttHandler.publish(
            "pearl-fix/availability/confirmation",
            JSON.stringify({ status: "failure", message: "Invalid message format" })
          );
          return;
        }

        const { dentist, workDays, timeSlots, date } = parsedMessage;

        // Validate message data
        if (!dentist || !mongoose.Types.ObjectId.isValid(dentist)) {
          console.error("Invalid or missing dentist ID.");
          await mqttHandler.publish(
            "pearl-fix/availability/confirmation",
            JSON.stringify({ status: "failure", message: "Invalid dentist ID" })
          );
          return;
        }

        if (!Array.isArray(workDays) || workDays.length === 0) {
          console.error("Invalid or empty workDays array.");
          await mqttHandler.publish(
            "pearl-fix/availability/confirmation",
            JSON.stringify({ status: "failure", message: "Invalid or empty workDays" })
          );
          return;
        }

        if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
          console.error("Invalid or empty timeSlots array.");
          await mqttHandler.publish(
            "pearl-fix/availability/confirmation",
            JSON.stringify({ status: "failure", message: "Invalid or empty timeSlots" })
          );
          return;
        }

        const baseDate = new Date(date);

        // Format time slots
        const formattedTimeSlots = timeSlots.map((slot: { start: string; end: string }) => {
          const startTimeParts = slot.start.split(":");
          const endTimeParts = slot.end.split(":");

          return {
            start: new Date(
              baseDate.setHours(parseInt(startTimeParts[0]), parseInt(startTimeParts[1]), 0, 0)
            ),
            end: new Date(
              baseDate.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0, 0)
            ),
            status: "available",
          };
        });

        // Create availability in the database
        const availability = new Availability({
          dentist,
          workDays,
          timeSlots: formattedTimeSlots,
        });

        await availability.save();

        console.log("Availability created:", availability);

        // Publish success confirmation
        await mqttHandler.publish(
          "pearl-fix/availability/confirmation",
          JSON.stringify({
            status: "success",
            message: "Availability created successfully",
            availabilityId: availability._id,
          })
        );
        console.log("Published success confirmation for availability ID:", availability._id);
      } catch (error) {
        console.error("Error processing availability message:", error);

        // Publish failure confirmation
        await mqttHandler.publish(
          "pearl-fix/availability/confirmation",
          JSON.stringify({
            status: "failure",
            message: "Error processing availability creation",
            error: error.message || String(error),
          })
        );
      }
    });

    console.log("Subscribed to 'pearl-fix/availability/set'.");
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
        if (dentistData) {
          resolve(dentistData);
        } else {
          reject(new Error("No dentist received from MQTT subscription"));
        }
      }, 10000); // Adjust timeout based on expected delays

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