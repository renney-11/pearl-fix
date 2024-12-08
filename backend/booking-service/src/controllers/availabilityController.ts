import { RequestHandler } from "express";
import Availability from "../models/Availability";
import { MQTTHandler } from "../mqtt/MqttHandler";
import mongoose from "mongoose";

// Initialize the MQTT handler
const mqttHandler = new MQTTHandler(process.env.CLOUDAMQP_URL!);


export const createAvailability: RequestHandler = async (req, res): Promise<void> => {
  const { dentist, workDays, timeSlots, date } = req.body;

  try {
    await mqttHandler.connect();

    // Check if valid dentist emails are provided
    if (!Array.isArray(dentist) || dentist.length === 0) {
      console.error("No valid dentist provided.");
      res.status(400).json({ message: "No valid dentist provided in request." });
      return;
    }

    // Publish dentists' emails to the topic
    if (Array.isArray(dentist) && dentist.length > 0) {
      for (const email of dentist) {
        if (typeof email === "string" && email.trim() !== "") {
          await mqttHandler.publish(
            "pearl-fix/availability/create/email",
            JSON.stringify({ email })
          );
          console.log(`Published successful message to "pearl-fix/availability/create/email": ${email}`);
        } else {
          console.error("Invalid email format in dentists array.");
        }
      }
    } else {
      console.error("No valid dentists provided.");
    }

    // Collect dentist data from the subscription
    const receivedDentists: any[] = await new Promise((resolve, reject) => {
      const dentistsData: any[] = [];
      const timeout = setTimeout(() => {
        if (dentistsData.length > 0) {
          resolve(dentistsData);
        } else {
          reject(new Error("No dentists received from MQTT subscription"));
        }
      }, 10000); // Adjust timeout based on expected delays

      mqttHandler.subscribe("pearl-fix/availability/create/dentist", (msg) => {
        try {
          const message = JSON.parse(msg.toString());
          console.log("Message received on 'pearl-fix/availability/create/dentist':", message);

          if (message.dentist) {
            dentistsData.push(message.dentist);
          }
        } catch (error) {
          console.error("Error processing dentist message:", error);
        }
      });
    });

    const baseDate = new Date(date); // Use the provided date for the time slots

    // Convert timeSlots to proper Date objects with the correct date
    const formattedTimeSlots = timeSlots.map((slot: { start: string; end: string }) => {
      const startTimeParts = slot.start.split(':');
      const endTimeParts = slot.end.split(':');

      // Set the full date with start and end times
      const startDate = new Date(baseDate.setHours(parseInt(startTimeParts[0]), parseInt(startTimeParts[1]), 0, 0));
      const endDate = new Date(baseDate.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0, 0));

      return {
        start: startDate,
        end: endDate,
        status: "available",
      };
    });

    const dentistId = receivedDentists[0]._id;

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
      }
    });
    console.log("Availability created:", availability);

    // Publish the availability ID and associated dentist emails
    await mqttHandler.publish(
      "pearl-fix/availability/create/id",
      JSON.stringify({ id: availability.id, emails: dentist })
    );
    console.log(`Published availability ID: ${availability.id} to 'pearl-fix/availability/create/id'.`);

    mqttHandler.close();
  } catch (error) {
    console.error("Error creating availability:", error);
    res.status(500).json({ message: "Server error." });
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
  }
};