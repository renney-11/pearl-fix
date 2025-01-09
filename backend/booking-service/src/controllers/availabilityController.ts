import { RequestHandler } from "express";
import Availability from "../models/Availability";
import { MQTTHandler } from "../mqtt/MqttHandler";
import mongoose from "mongoose";

// Initialize the MQTT handler
const mqttHandler = new MQTTHandler(process.env.CLOUDAMQP_URL!);

mqttHandler.subscribe("pearl-fix/availability/clinic-id", async (msg) => {
  try {
    console.log(`Message received on 'pearl-fix/availability/clinic-id':`, msg);

    const { clinicId } = JSON.parse(msg.toString());
    if (!clinicId) {
      console.error("Invalid message: Missing clinicId");
      return;
    }

    console.log("Fetching availabilities for clinicId:", clinicId);
    const availabilities = await Availability.find({ clinicId });

    if (!availabilities || availabilities.length === 0) {
      console.log(`No availabilities found for clinicId: ${clinicId}`);
      await mqttHandler.publish("pearl-fix/availability/clinic/all", JSON.stringify({
        status: "failure",
        message: "No availabilities found.",
      }));
      return;
    }

    console.log(`Found ${availabilities.length} availabilities for clinicId: ${clinicId}`);

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

    if (uniqueTimeSlots.length === 0) {
      await mqttHandler.publish("pearl-fix/availability/clinic/all", JSON.stringify({
        status: "failure",
        message: "No available time slots found.",
      }));
      return;
    }

    await mqttHandler.publish("pearl-fix/availability/clinic/all", JSON.stringify({
      status: "success",
      clinicId,
      timeSlots: uniqueTimeSlots,
    }));

    console.log(`Published available timeSlots to 'pearl-fix/availability/clinic/all'`);
  } catch (error) {
    console.error("Error processing availability message:", error);
    await mqttHandler.publish("pearl-fix/availability/clinic/all", JSON.stringify({
      status: "failure",
      message: "Error processing availability message.",
      error: error.message,
    }));
  }
});

// CREATE AVAILABILITIES METHOD BY DENTISTS
(async () => {
  try {
    await mqttHandler.connect();

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
          return; // Exit on failure
        }

        // Extract and validate required fields
        const { date, availableSlots, token } = parsedMessage;
        console.log(date, availableSlots, token);

        if (!date || !availableSlots || !token) {
          console.error("Missing required fields in message.");
          await mqttHandler.publish(
            "pearl-fix/availability/confirmation",
            JSON.stringify({ status: "failure", message: "Missing required fields" })
          );
          return; // Exit on failure
        }

        // Token verification step
        await mqttHandler.publish(
          "pearl-fix/authentication/verify-dentist",
          JSON.stringify({ token })
        );
        console.log(`Published token to 'pearl-fix/authentication/verify-dentist': ${token}`);

        await mqttHandler.subscribe("pearl-fix/authentication/verify-dentist/email", async (emailMsg) => {
          try {
            const emailData = JSON.parse(emailMsg.toString());
            console.log(emailData);
            const dentistEmail = emailData.email;
            console.log(`Dentist email verified: ${dentistEmail}`);

            // Publish dentist email
            await mqttHandler.publish(
              "pearl-fix/availability/create/email",
              JSON.stringify({ email: dentistEmail })
            );
            console.log(`Published dentist email: ${dentistEmail}`);

            await mqttHandler.subscribe("pearl-fix/availability/create/dentist", async (dentistMsg) => {
              try {
                const dentistMessage = JSON.parse(dentistMsg.toString());
                console.log("Message received on 'pearl-fix/availability/create/dentist':", dentistMessage);
                const receivedDentist = dentistMessage.dentist;
                console.log("Received dentist: ", receivedDentist);

                if (!receivedDentist?._id) {
                  console.error("Dentist not found from MQTT data.");
                  await mqttHandler.publish(
                    "pearl-fix/availability/confirmation",
                    JSON.stringify({ status: "failure", message: "Dentist not found from MQTT data." })
                  );
                  return; // Exit on failure
                }

                const dentistId = receivedDentist._id;

                // Process clinic data
                await mqttHandler.publish(
                  "pearl-fix/booking/find/clinic",
                  JSON.stringify({ dentistId })
                );
                console.log(`Published dentistId to "pearl-fix/booking/find/clinic":`, dentistId);

                await mqttHandler.subscribe("pearl-fix/booking/clinic", async (clinicMsg) => {
                  try {
                    const clinicMessage = JSON.parse(clinicMsg.toString());
                    console.log("Message received on 'pearl-fix/booking/clinic':", clinicMessage);
                    const clinic = clinicMessage.clinic;
                    console.log("Received clinic: ", clinic);

                    if (!clinic?._id) {
                      console.error("Clinic not found from MQTT data.");
                      await mqttHandler.publish(
                        "pearl-fix/availability/confirmation",
                        JSON.stringify({ status: "failure", message: "Clinic not found from MQTT data." })
                      );
                      return; // Exit on failure
                    }

                    const clinicId = clinic._id;

                    // Process time slots
                    const baseDate = new Date(date);
                    const formattedTimeSlots = availableSlots.map((slot: { start: string; end: string }) => {
                      const [startHour, startMinute] = slot.start.split(":").map(Number);
                      const [endHour, endMinute] = slot.end.split(":").map(Number);

                      return {
                        start: new Date(baseDate.setHours(startHour, startMinute)),
                        end: new Date(baseDate.setHours(endHour, endMinute)),
                        status: "available",
                      };
                    });

                    // Create and save availability
                    const availability = new Availability({
                      dentist: dentistId,
                      timeSlots: formattedTimeSlots,
                      clinicId,
                    });

                    await availability.save();

                    console.log("Availability created:", availability);

                    // Publish success confirmation
                    await mqttHandler.publish(
                      "pearl-fix/availability/confirmation",
                      JSON.stringify({
                        status: "success",
                        message: "Availability created successfully.",
                        dentistId,
                        availabilityId: availability.id,
                      })
                    );
                    console.log(`Published success confirmation for dentistId: ${dentistId}`);

                  } catch (error) {
                    console.error("Error processing clinic message:", error);
                  }
                });

              } catch (error) {
                console.error("Error processing dentist message:", error);
              }
            });

          } catch (error) {
            console.error("Error parsing email verification message:", error);
          }
        });

      } catch (error) {
        console.error("Error handling availability message:", error);
        await mqttHandler.publish(
          "pearl-fix/availability/confirmation",
          JSON.stringify({ status: "failure", message: error.message })
        );
      }
    });
  } catch (error) {
    console.error("Error connecting to MQTT broker:", error);
  }
})();


export const createAvailability: RequestHandler = async (req, res): Promise<void> => {
  const { dentist, workDays, timeSlots, date, clinicId } = req.body;

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
      clinicId,  // Add clinicId to the availability document
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
        clinicId,  // Return the clinicId in the response
      },
    });
    console.log("Availability created:", availability);

    await mqttHandler.publish(
      "pearl-fix/availability/create/id",
      JSON.stringify({ id: availability.id, email: dentist })
    );
    console.log(`Published availability ID: ${availability.id} to 'pearl-fix/availability/create/id'.`);

  } catch (error) {
    console.error("Error creating availability:", error);
    res.status(500).json({ message: "Server error." });
  }
};

export const createAvailabilities: RequestHandler = async (req, res): Promise<void> => {
  try {

      try {
        await mqttHandler.connect();
        console.log("Connected to MQTT broker");

        const { dentist, workDays, timeSlots, date, clinicId } = req.body;
        
        const baseDate = new Date(date);

        const formattedTimeSlots = timeSlots.map((slot: { start: string; end: string }) => {
          const startTimeParts = slot.start.split(":");
          const endTimeParts = slot.end.split(":");

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

        const availability = new Availability({
          dentist,
          workDays,
          timeSlots: formattedTimeSlots,
          clinicId,  // Add clinicId to the availability document
        });

        await availability.save();

        // Publish the created availability to broker
        await mqttHandler.publish(
          "pearl-fix/availabilities/create/success",
          JSON.stringify({
            message: "Availability created successfully.",
            availability: {
              dentist,
              workDays,
              timeSlots: formattedTimeSlots,
              clinicId,  // Return the clinicId in the response
            },
          })
        );

        console.log("Availability created:", availability);
        
      } catch (error) {
        console.error("Error processing the message:", error);
        mqttHandler.publish("pearl-fix/availabilities/create/error", JSON.stringify({ message: "Error processing availability creation." }));
    };

    // Respond that the request is being processed
    res.status(202).json({ message: "Availability creation in process." });
    
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