// src/pages/api/createBooking.ts
import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel } from "amqplib";

let connection: Connection | null = null;
let channel: Channel | null = null;

// Establish a RabbitMQ connection and channel
async function connectRabbitMQ() {
  const amqpUrl = process.env.RABBITMQ_URL || "amqp://localhost";
  if (!connection) {
    console.log(`Connecting to RabbitMQ at ${amqpUrl}...`);
    connection = await amqp.connect(amqpUrl);
  }
  if (!channel) {
    channel = await connection.createChannel();
  }
  return { connection, channel };
}

// Ensure a queue exists
async function setupQueue(queueName: string) {
  if (!channel) throw new Error("Channel is not initialized");
  await channel.assertQueue(queueName, { durable: true });
}

// Cleanup function to safely close RabbitMQ connections and channels
async function cleanup() {
  try {
    if (channel) {
      await channel.close();
      console.log("RabbitMQ channel closed.");
    }
    if (connection) {
      await connection.close();
      console.log("RabbitMQ connection closed.");
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    channel = null;
    connection = null;
  }
}

// Main handler function
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { dentistId, patientEmail, timeSlot } = req.body;

  // Validate input
  if (!dentistId || !patientEmail || !timeSlot || !timeSlot.start || !timeSlot.end) {
    return res
      .status(400)
      .json({ error: "dentistId, patientEmail, and timeSlot (with start and end) are required." });
  }

  const queue = "pearl-fix/booking/create";
  const authenticateQueue = "pearl-fix/booking/authenticate";
  let responseSent = false;

  try {
    const { connection, channel } = await connectRabbitMQ();

    // Publish booking details to the queue
    await setupQueue(queue);
    const payload = { dentistId, patientEmail, timeSlot };
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    console.log("Message published to booking queue:", payload);

    // Listen for responses from the authenticate queue
    console.log("Listening for response on authenticate queue...");
    await setupQueue(authenticateQueue);

    const timeout = setTimeout(() => {
      if (!responseSent) {
        console.error("Timeout waiting for response.");
        responseSent = true;
        res.status(500).json({ error: "Authentication response timeout." });
        cleanup();
      }
    }, 10000); // 10 seconds timeout

    channel.consume(
      authenticateQueue,
      (msg) => {
        if (msg) {
          const message = JSON.parse(msg.content.toString());
          console.log("Message received from authenticate queue:", message);

          if (!responseSent) {
            if (message.token) {
              responseSent = true;
              clearTimeout(timeout);
              channel.ack(msg);
              res.status(200).json({ token: message.token });
              cleanup();
            } else if (message.error) {
              responseSent = true;
              clearTimeout(timeout);
              channel.ack(msg);
              res.status(401).json({ error: message.error });
              cleanup();
            } else {
              console.error("Unexpected message format:", message);
              channel.ack(msg);
              res.status(500).json({ error: "Unexpected message format." });
              cleanup();
            }
          }
        }
      },
      { noAck: false }
    );
  } catch (error) {
    console.error("Error handling request:", error);
    if (!responseSent) {
      res.status(500).json({ error: "Internal server error." });
    }
    cleanup();
  }
}
