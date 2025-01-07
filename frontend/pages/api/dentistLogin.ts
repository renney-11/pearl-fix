import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";

let connection: Connection | null = null;
let channel: Channel | null = null;

async function connectRabbitMQ() {
  if (!connection) {
    const amqpUrl = process.env.RABBITMQ_URL || "amqp://localhost"; // Get URL from env variable
    console.log(`Connecting to RabbitMQ at ${amqpUrl}...`);
    connection = await amqp.connect(amqpUrl);
  }
  if (!channel) {
    channel = await connection.createChannel();
  }
  return { connection, channel };
}

async function setupQueue(queueName: string) {
  if (!channel) throw new Error("Channel is not initialized");
  await channel.assertQueue(queueName, { durable: true });
}

async function purgeQueue(queueName: string) {
  if (!channel) throw new Error("Channel is not initialized");
  try {
    await channel.purgeQueue(queueName);
    console.log(`Purged all messages from queue: ${queueName}`);
  } catch (err) {
    console.error(`Error purging queue ${queueName}:`, err);
  }
}

async function consumeQueue(queueName: string, callback: (msg: ConsumeMessage | null) => void) {
  if (!channel) throw new Error("Channel is not initialized");
  await setupQueue(queueName);
  channel.consume(queueName, callback, { noAck: false });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  try {
    const { connection, channel } = await connectRabbitMQ();
    const loginQueue = "pearl-fix/authentication/dentist/login";
    const authenticateQueue = "pearl-fix/authentication/dentist/authenticate";

    // Publish login data
    const payload = { email, password };
    await setupQueue(loginQueue);
    channel.sendToQueue(loginQueue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    console.log("Message published:", payload);

    // Consume the authentication queue
    console.log("Listening for token on authenticate queue...");
    await setupQueue(authenticateQueue);

    let responseSent = false;
    const timeout = setTimeout(async () => {
      if (!responseSent) {
        console.error("Timeout waiting for token.");
        res.status(500).json({ error: "Failed to receive token." });
        await cleanupResources(authenticateQueue);
      }
    }, 10000); // 10 seconds timeout

    await consumeQueue(authenticateQueue, async (msg) => {
      if (msg) {
        const message = JSON.parse(msg.content.toString());
        console.log("Message received:", message);

        if (!responseSent) {
          if (message.token) {
            // Token received, login successful
            responseSent = true;
            clearTimeout(timeout);
            channel.ack(msg);
            await purgeQueue(authenticateQueue);
            res.status(200).json({ token: message.token });
            await cleanupResources(authenticateQueue);
          } else if (message.message || message.error) {
            // Invalid credentials or other error
            responseSent = true;
            clearTimeout(timeout);
            channel.ack(msg);
            res.status(401).json({ error: message.message || message.error });
            await cleanupResources(authenticateQueue);
          } else {
            console.error("Unexpected message format:", message);
            responseSent = true;
            clearTimeout(timeout);
            channel.ack(msg);
            res.status(500).json({ error: "Unexpected message format." });
            await cleanupResources(authenticateQueue);
          }
        }
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error." });
    await cleanupResources();
  }
}

async function cleanupResources(authenticateQueue?: string) {
  try {
    if (authenticateQueue) {
      await purgeQueue(authenticateQueue); // Ensure queue is cleaned even on error
    }
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    console.log("RabbitMQ resources cleaned up.");
  } catch (err) {
    console.error("Error during RabbitMQ cleanup:", err);
  }
}
