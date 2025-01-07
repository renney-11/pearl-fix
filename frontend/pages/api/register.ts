import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";

let connection: Connection | null = null;
let channel: Channel | null = null;

// Reset function for clearing connection and state
async function resetState() {
  if (channel) {
    await channel.close(); // Close any existing channel
    channel = null;
  }
  if (connection) {
    await connection.close(); // Close any existing connection
    connection = null;
  }
}

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

async function consumeQueue(queueName: string, callback: (msg: ConsumeMessage | null) => void) {
  if (!channel) throw new Error("Channel is not initialized");
  await setupQueue(queueName);
  channel.consume(queueName, callback, { noAck: false });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Reset everything to ensure no old state is used
  await resetState(); // Clear old cache, channels, and connections

  const { name, email, password } = req.body;

  try {
    const { connection, channel } = await connectRabbitMQ();
    const registerQueue = "pearl-fix/authentication/register";
    const authenticateQueue = "pearl-fix/authentication/authenticate";

    // Publish signup data
    const payload = { name, email, password };
    await setupQueue(registerQueue);
    channel.sendToQueue(registerQueue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    console.log("Message published:", payload);

    // Consume the authentication queue
    console.log("Listening for token on authenticate queue...");
    await setupQueue(authenticateQueue);

    let tokenReceived = false;
    const timeout = setTimeout(() => {
      if (!tokenReceived) {
        console.error("Timeout waiting for token.");
        res.status(500).json({ error: "Failed to receive token." });
        resetState(); // Reset state on timeout
      }
    }, 10000); // 10 seconds

    await consumeQueue(authenticateQueue, (msg) => {
      if (msg) {
        const message = JSON.parse(msg.content.toString());
        if (message.token) {
          console.log("Token received:", message.token);
          tokenReceived = true;
          clearTimeout(timeout);
          channel.ack(msg);
          res.status(200).json({ token: message.token });
          resetState(); // Clean up after success
        }
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error." });
    await resetState(); // Reset on error as well
  }
}
