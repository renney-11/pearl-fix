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

// API handler for logout
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const { channel } = await connectRabbitMQ();
    const logoutQueue = "pearl-fix/patient/logout";

    // Ensure the queue exists
    await channel.assertQueue(logoutQueue, { durable: true });

    // Publish the logout message
    const payload = { email };
    channel.sendToQueue(logoutQueue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    console.log("Logout message published:", payload);

    return res.status(200).json({ message: "Logout message sent successfully" });
  } catch (error) {
    console.error("Error publishing logout message:", error);
    return res.status(500).json({ error: "Failed to send logout message" });
  }
}
