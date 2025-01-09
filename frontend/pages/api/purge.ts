// src/pages/api/purge.ts
import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel } from "amqplib";

let connection: Connection | null = null;
let channel: Channel | null = null;

// RabbitMQ connection URL
const amqpUrl = process.env.RABBITMQ_URL || "amqp://localhost";

// List of queues to purge
const queues = [
  "pearl-fix/authentication/authenticate",
  "pearl-fix/authentication/dentist/authenticate",
  "pearl-fix/authentication/dentist/login",
  "pearl-fix/authentication/login",
  "pearl-fix/authentication/register",
  "pearl-fix/authentication/verify-dentist",
  "pearl-fix/authentication/verify-dentist/email",
  "pearl-fix/authentication/verify-patient",
  "pearl-fix/authentication/verify-patient/email",
  "pearl-fix/availability/clinic-id",
  "pearl-fix/availability/clinic/all",
  "pearl-fix/availability/confirmation",
  "pearl-fix/availability/confirmations",
  "pearl-fix/availability/create/dentist",
  "pearl-fix/availability/create/email",
  "pearl-fix/availability/create/id",
  "pearl-fix/availability/get/clinic-id",
  "pearl-fix/availability/remove",
  "pearl-fix/availability/set",
  "pearl-fix/booking/authenticate",
  "pearl-fix/booking/canceled",
  "pearl-fix/booking/canceled/dentist-email",
  "pearl-fix/booking/canceled/patient-email",
  "pearl-fix/booking/clinic",
  "pearl-fix/booking/create",
  "pearl-fix/booking/create/authenticate",
  "pearl-fix/booking/create/patient",
  "pearl-fix/booking/create/patient/email",
  "pearl-fix/booking/date-time",
  "pearl-fix/booking/dentist/all-data",
  "pearl-fix/booking/dentist/cancel",
  "pearl-fix/booking/dentist/cancel/authenticate",
  "pearl-fix/booking/dentist/email",
  "pearl-fix/booking/find/clinic",
  "pearl-fix/booking/find/dentist-email",
  "pearl-fix/booking/find/dentist-id",
  "pearl-fix/booking/find/dentist/email",
  "pearl-fix/booking/find/dentist/for-clinic",
  "pearl-fix/booking/find/patient-id",
  "pearl-fix/booking/patient-email",
  "pearl-fix/booking/patient/all-data",
  "pearl-fix/booking/patient/cancel",
  "pearl-fix/booking/patient/cancel/authenticate",
  "pearl-fix/booking/patient/cancel/id",
  "pearl-fix/booking/patient/email",
  "pearl-fix/booking/patient/get-all",
  "pearl-fix/booking/update/dentist",
  "pearl-fix/booking/update/patient",
  "pearl-fix/clinic/all-data",
  "pearl-fix/clinic/create/email",
  "pearl-fix/clinic/create/id",
  "pearl-fix/clinic/get-all",
];

// Connect to RabbitMQ
async function connectRabbitMQ() {
  if (!connection) {
    console.log(`Connecting to RabbitMQ at ${amqpUrl}...`);
    connection = await amqp.connect(amqpUrl);
  }
  if (!channel) {
    channel = await connection.createChannel();
  }
  return { connection, channel };
}

// Purge all queues
async function purgeQueues() {
  if (!channel) throw new Error("Channel is not initialized");

  for (const queue of queues) {
    try {
      // Ensure the queue exists before purging
      await channel.assertQueue(queue, { durable: true });
      const result = await channel.purgeQueue(queue);
      console.log(`Purged ${result.messageCount} messages from queue: ${queue}`);
    } catch (error) {
      console.error(`Failed to purge queue "${queue}":`, error.message);
    }
  }
}

// Cleanup function
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

// API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    // Connect to RabbitMQ
    const { connection, channel } = await connectRabbitMQ();

    // Purge queues
    await purgeQueues();

    // Respond to the client
    res.status(200).json({ message: "All queues purged successfully." });
  } catch (error) {
    console.error("Error purging queues:", error);
    res.status(500).json({ error: "Failed to purge queues." });
  } finally {
    // Cleanup RabbitMQ resources
    await cleanup();
  }
}
