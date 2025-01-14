import { RequestHandler } from "express";
import Availability from "../models/Availability";
import { MQTTHandler } from "../mqtt/MqttHandler";
import mongoose from "mongoose";
import { initializeAvailabilityGauge } from "../metrics/availabilityMetrics";
import { incrementAvailability } from "../metrics/availabilityMetrics";
import { register as prometheusRegister } from "prom-client";

(async () => {
  try {
    // Initialize gauge on service startup
    await initializeAvailabilityGauge();
  } catch (error) {
    console.error("Error initializing metrics:", error);
  }
})();

export const metrics: RequestHandler = async (req, res): Promise<void> => {
  try {
    res.set("Content-Type", prometheusRegister.contentType);
    res.end(await prometheusRegister.metrics());
  } catch (error) {
    console.error("Error serving Prometheus metrics:", error);
    res.status(500).json({ message: "Error serving Prometheus metrics." });
  }
};

// Initialize the MQTT handler
const mqttHandler = new MQTTHandler(process.env.CLOUDAMQP_URL!);

// GET AVAILABILITIES METHOD MAIN
(async () => {
  try {
    await mqttHandler.connect();

    await mqttHandler.subscribe(
      "pearl-fix/availability/clinic-id",
      handleAvailabilityRequest
    );
  } catch (error) {
    console.error("Error during MQTTHandler initialization:", error);
  }
})();

// Handles incoming availability requests
const handleAvailabilityRequest = async (msg: any) => {
  try {
    console.log(`Message received on 'pearl-fix/availability/clinic-id':`, msg);

    const { clinicId } = JSON.parse(msg.toString());
    if (!clinicId) {
      console.error("Invalid message: Missing clinicId");
      await publishFailureMessage(
        "pearl-fix/availability/clinic/all",
        "Invalid message: Missing clinicId"
      );
      return;
    }

    const uniqueTimeSlots = await fetchAvailabilities(clinicId);

    if (uniqueTimeSlots.length === 0) {
      await publishFailureMessage(
        "pearl-fix/availability/clinic/all",
        "No available time slots found."
      );
      return;
    }

    await mqttHandler.publish(
      "pearl-fix/availability/clinic/all",
      JSON.stringify({
        status: "success",
        clinicId,
        timeSlots: uniqueTimeSlots,
      })
    );

    console.log(
      `Published available timeSlots to 'pearl-fix/availability/clinic/all'`
    );
  } catch (error) {
    console.error("Error processing availability message:", error);
    await publishFailureMessage(
      "pearl-fix/availability/clinic/all",
      `Error processing availability message: ${error.message}`
    );
  }
};

// Fetches availabilities for a given clinic and returns unique available time slots
const fetchAvailabilities = async (clinicId: string) => {
  console.log("Fetching availabilities for clinicId:", clinicId);

  const availabilities = await Availability.find({ clinicId });

  if (!availabilities || availabilities.length === 0) {
    console.log(`No availabilities found for clinicId: ${clinicId}`);
    return [];
  }

  console.log(
    `Found ${availabilities.length} availabilities for clinicId: ${clinicId}`
  );

  const availableTimeSlots = availabilities.flatMap((availability) =>
    availability.timeSlots
      .filter((timeSlot) => timeSlot.status === "available")
      .map((timeSlot) => ({
        start: timeSlot.start.toISOString(),
        end: timeSlot.end.toISOString(),
        status: timeSlot.status,
        dentist: availability.dentist,
      }))
  );

  const uniqueTimeSlots = Array.from(
    new Map(
      availableTimeSlots.map((slot) => [`${slot.start}-${slot.end}`, slot])
    ).values()
  );

  return uniqueTimeSlots;
};

// Publishes a failure message to the given MQTT topic
const publishFailureMessage = async (topic: string, message: string) => {
  await mqttHandler.publish(
    topic,
    JSON.stringify({
      status: "failure",
      message,
    })
  );
};

// END OF GET AVAILABILITIES SECTION



// START OF CREATE AVAILABILITIES SECTION 
// Helper to parse incoming message
const parseMessage = async (msg) => {
  try {
    return JSON.parse(msg.toString());
  } catch (err) {
    console.error("Failed to parse message:", err);
    throw new Error("Invalid message format");
  }
};

// Helper to publish an error confirmation message
const publishFailure = async (mqttHandler, message) => {
  await mqttHandler.publish(
    "pearl-fix/availability/confirmation",
    JSON.stringify({ status: "failure", message })
  );
};


// Main handler function to create AVAILABILITIES
(async () => {
  try {
    await mqttHandler.connect();

    await mqttHandler.subscribe("pearl-fix/availability/set", async (msg) => {
      try {
        console.log("Message received on 'pearl-fix/availability/set':", msg);

        // Parse the message
        const parsedMessage = await parseMessage(msg);
        const { timeSlots, token } = parsedMessage;

        if (!timeSlots || !token) {
          console.error("Missing required fields in message.");
          return await publishFailure(mqttHandler, "Missing required fields");
        }

        // Log the received timeSlots
        console.log("Step 1: Received timeSlots:", timeSlots);

        // Create a local copy of timeSlots to avoid unintended mutations
        const currentSlots = [...timeSlots];

        // Authenticate the dentist
        await mqttHandler.publish(
          "pearl-fix/authentication/verify-dentist",
          JSON.stringify({ token })
        );
        console.log(`Published token for verification: ${token}`);

        // Pass the scoped `currentSlots` down the chain
        await handleDentistVerification(mqttHandler, currentSlots);
      } catch (error) {
        console.error("Error handling availability message:", error);
        await publishFailure(mqttHandler, error.message);
      }
    });
  } catch (error) {
    console.error("Error connecting to MQTT broker:", error);
  }
})();


// Handle dentist verification
const handleDentistVerification = async (mqttHandler, timeSlots) => {
  await mqttHandler.subscribe(
    "pearl-fix/authentication/verify-dentist/email",
    async (emailMsg) => {
      try {
        const emailData = await parseMessage(emailMsg);
        const dentistEmail = emailData.email;
        console.log(`Dentist email verified: ${dentistEmail}`);

        await mqttHandler.publish(
          "pearl-fix/availability/create/email",
          JSON.stringify({ email: dentistEmail })
        );

        // Forward to dentist details handler
        await handleDentistDetails(mqttHandler, timeSlots);
      } catch (error) {
        console.error("Error parsing email verification message:", error);
      }
    }
  );
};

// Handle dentist details retrieval
const handleDentistDetails = async (mqttHandler, timeSlots) => {
  await mqttHandler.subscribe(
    "pearl-fix/availability/create/dentist",
    async (dentistMsg) => {
      try {
        const dentistMessage = await parseMessage(dentistMsg);
        const receivedDentist = dentistMessage.dentist;

        if (!receivedDentist?._id) {
          console.error("Dentist not found from MQTT data.");
          return await publishFailure(mqttHandler, "Dentist not found.");
        }

        const dentistId = receivedDentist._id;

        // Publish dentist ID for clinic association
        await mqttHandler.publish(
          "pearl-fix/booking/find/clinic",
          JSON.stringify({ dentistId })
        );

        // Forward to clinic details handler
        await handleClinicDetails(mqttHandler, timeSlots, dentistId);
      } catch (error) {
        console.error("Error processing dentist message:", error);
      }
    }
  );
};

// Handle clinic details retrieval
const handleClinicDetails = async (mqttHandler, timeSlots, dentistId) => {
  await mqttHandler.subscribe("pearl-fix/booking/clinic", async (clinicMsg) => {
    try {
      const clinicMessage = await parseMessage(clinicMsg);
      const clinic = clinicMessage.clinic;

      if (!clinic?._id) {
        console.error("Clinic not found.");
        return await publishFailure(mqttHandler, "Clinic not found.");
      }

      const clinicId = clinic._id;

      // Log the timeSlots before saving
      console.log("Step 2: Saving timeSlots to availability:", timeSlots);

      const availability = new Availability({
        dentist: dentistId,
        timeSlots: timeSlots.map((slot) => ({
          start: new Date(slot.start).toISOString(),
          end: new Date(slot.end).toISOString(),
          status: slot.status,
        })),
        clinicId,
      });

      await availability.save();

      incrementAvailability(timeSlots.length);


      console.log("Availability created:", availability);

      await mqttHandler.publish(
        "pearl-fix/availability/confirmation",
        JSON.stringify({
          status: "success",
          message: "Availability created successfully.",
          dentistId,
          availabilityId: availability.id,
        })
      );
    } catch (error) {
      console.error("Error processing clinic message:", error);
    }
  });
};

interface DentistRequest {
  email: string;
  resolve: (data: any) => void;
  reject: (error: Error) => void;
}

// message queue 
const dentistQueue: DentistRequest[] = [];

const processDentistQueue = () => {
  if (dentistQueue.length > 0) {
    const { email, resolve, reject } = dentistQueue.shift()!;
    mqttHandler.publish("pearl-fix/availability/create/email", JSON.stringify({ email }))
      .then(() => {
        mqttHandler.subscribe("pearl-fix/availability/create/dentist", (message) => {
          const dentistData = JSON.parse(message).dentist;
          if (dentistData) {
            resolve(dentistData);
          } else {
            reject(new Error("Dentist data not found"));
          }
        });
      })
      .catch(reject);
  }
};

// Function to request dentist data
const requestDentistData = (email: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    dentistQueue.push({ email, resolve, reject });
    processDentistQueue();
  });
};

// In-memory cache to store dentist data
const cache = {
  dentist: null as any, // Will hold dentist data
};

export const createAvailability: RequestHandler = async (req, res) => {
  const { dentist, workDays, timeSlots, date, clinicId } = req.body;

  try {
    await mqttHandler.connect();

    // Check if dentist data is already cached
    let cachedDentist = cache.dentist;

    if (!cachedDentist || cachedDentist.email !== dentist) {
      // Publish dentist email or ID to the topic
      await mqttHandler.publishWithIsolation(
        "pearl-fix/availability/create/email",
        JSON.stringify({ email: dentist })
      );

      // Collect dentist data from the subscription with isolation
      const receivedDentist: any = await new Promise((resolve, reject) => {
        let dentistData: any = null;
        const timeout = setTimeout(() => {
          reject(new Error("No dentist received from MQTT subscription"));
        }, 10000);

        mqttHandler.subscribeWithIsolation("pearl-fix/availability/create/dentist", (msg, channel) => {
          try {
            const message = JSON.parse(msg.content.toString());
            if (message.dentist) {
              dentistData = message.dentist;
              cache.dentist = dentistData; // Cache the dentist data
              clearTimeout(timeout); // Clear timeout as we got the data
              resolve(dentistData);
            }
          } catch (error) {
            console.error("Error processing dentist message:", error);
          } finally {
            channel.ack(msg); // Acknowledge the message
          }
        });
      });

      if (!receivedDentist?._id) {
        res.status(404).json({ message: "Dentist not found from MQTT data." });
        return;
      }

      cachedDentist = receivedDentist; // Update cached data
    } else {
      console.log("Using cached dentist data:", cachedDentist);
    }

    const dentistId = cachedDentist._id;
    const baseDate = new Date(date);
    const formattedTimeSlots = timeSlots.map((slot: { start: string; end: string }) => {
      const start = new Date(baseDate);
      const end = new Date(baseDate);
      const [startHour, startMinute] = slot.start.split(":").map(Number);
      const [endHour, endMinute] = slot.end.split(":").map(Number);

      start.setHours(startHour, startMinute, 0, 0);
      end.setHours(endHour, endMinute, 0, 0);

      return { start, end, status: "available" };
    });

    const availability = new Availability({ dentist: dentistId, workDays, timeSlots: formattedTimeSlots, clinicId });
    await availability.save();

    res.status(201).json({ message: "Availability created successfully.", availability });
    await mqttHandler.publish("pearl-fix/availability/create/id", JSON.stringify({ id: availability.id, email: dentist }));
  } catch (error) {
    console.error("Error creating availability:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const getAvailability: RequestHandler = async (req, res): Promise<void> => {
  // pearl-fix/availability/get/clinic-id
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



export const getAvailabilitiesForClinic: RequestHandler = async (req, res): Promise<void> => {
  const { clinicId } = req.body;

  try {
    if (!clinicId) {
      res.status(400).json({ message: "Clinic ID is required." });
      return;
    }

    const availabilities = await Availability.find({ clinicId });

    if (!availabilities || availabilities.length === 0) {
      res.status(404).json({ message: "No availabilities found for the given clinic." });
      return;
    }
    
    const formattedAvailabilities = availabilities.map((availability) => {
      return {
        _id: availability._id,
        dentist: availability.dentist, // You can modify this to return more details of the dentist if needed
        workDays: availability.workDays,
        timeSlots: availability.timeSlots.map((timeSlot) => ({
          start: timeSlot.start.toISOString(),  // Format start time as string
          end: timeSlot.end.toISOString(),  // Format end time as string
          status: timeSlot.status,
        })),
      };
    });

    res.status(200).json({ availabilities: formattedAvailabilities });

  } catch (error) {
    console.error("Error fetching availabilities for clinic:", error);
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
