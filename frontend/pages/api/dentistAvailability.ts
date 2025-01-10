import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";
import { NextApiRequest, NextApiResponse } from "next";

interface Slot {
  start: string; // Start time in HH:mm format
  end: string;   // End time in HH:mm format
  status: string; // Slot status (e.g., "available")
}

interface SlotData {
  timeSlots: {
    start: string; // ISO string for start time
    end: string;   // ISO string for end time
    status: string; // Slot status
  }[];
  token: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized - Missing or invalid token" });
  }
  const token = authHeader.split(" ")[1]; // Retrieve the actual token part

  const { date, availableSlots } = req.body; // `date` in YYYY-MM-DD format
  let connection: Connection | null = null;
  let channel: Channel | null = null;

  try {
    // Preprocess availableSlots into timeSlots
    const timeSlots = availableSlots.map((slot: Slot) => {
      const baseDate = new Date(date);
      const [startHour, startMinute] = slot.start.split(":").map(Number);
      const [endHour, endMinute] = slot.end.split(":").map(Number);

      const start = new Date(baseDate);
      start.setHours(startHour, startMinute, 0, 0);

      const end = new Date(baseDate);
      end.setHours(endHour, endMinute, 0, 0);

      return {
        start: start.toISOString(),
        end: end.toISOString(),
        status: slot.status,
      };
    });

    // Connect to RabbitMQ
    const amqpUrl = process.env.RABBITMQ_URL || "amqp://localhost";
    connection = await amqp.connect(amqpUrl);
    channel = await connection.createChannel();

    const setAvailabilityQueue = "pearl-fix/availability/set";

    // Purge the queue before publishing a new message
    await channel.purgeQueue(setAvailabilityQueue);
    console.log(`Queue "${setAvailabilityQueue}" purged successfully.`);

    // Publish the message to set the availability
    await channel.assertQueue(setAvailabilityQueue, { durable: true });

    const payload: SlotData = {
      timeSlots,
      token, // Token retrieved from header
    };
    console.log("Sending availability data:", payload);

    channel.sendToQueue(setAvailabilityQueue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    console.log("Published message to set availability", payload);

    const responseQueue = "pearl-fix/availability/confirmation";
    await channel.assertQueue(responseQueue, { durable: true });

    console.log("Waiting for confirmation...");

    // Wait for the response message
    const confirmation = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error("Timeout waiting for confirmation.");
        reject("Timeout waiting for confirmation.");
      }, 10000); // 10 seconds timeout

      channel.consume(
        responseQueue,
        (msg: ConsumeMessage | null) => {
          if (msg) {
            try {
              const message = JSON.parse(msg.content.toString());
              console.log("Received confirmation:", message);

              // Ensure the message is acknowledged
              channel.ack(msg);
              clearTimeout(timeout);
              resolve(message.status);
            } catch (error) {
              console.error("Error processing confirmation message:", error);
              channel.nack(msg, false, false); // Prevent requeuing of bad message
              reject(error);
            }
          }
        },
        { noAck: false }
      );
    });

    // Respond with the confirmation status
    res.status(200).json({ status: confirmation });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    // Ensure the connection and channel are closed
    try {
      if (channel) await channel.close();
      if (connection) await connection.close();
    } catch (error) {
      console.error("Error closing connection/channel:", error);
    }
  }
}
