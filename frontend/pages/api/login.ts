import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";

let connection: Connection | null = null;
let channel: Channel | null = null;

// Reset function for clearing connection and state
async function resetState() {
  if (channel) await channel.close(); // Close any existing channel
  if (connection) await connection.close(); // Close any existing connection
  connection = null;
  channel = null;
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
  await resetState();  // Clear old cache, channels, and connections

  const { email, password } = req.body;

  try {
    const { connection, channel } = await connectRabbitMQ();
    const loginQueue = "pearl-fix/authentication/login";
    const authenticateQueue = "pearl-fix/authentication/authenticate";

    // Publish login data
    const payload = { email, password };
    await setupQueue(loginQueue);
    channel.sendToQueue(loginQueue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    console.log("Message published:", payload);

    // Consume the authentication queue
    console.log("Listening for response on authenticate queue...");
    await setupQueue(authenticateQueue);

    let responseReceived = false;
    const timeout = setTimeout(() => {
      if (!responseReceived) {
        console.error("Timeout waiting for response.");
        res.status(500).json({ error: "Failed to receive authentication response." });
        channel?.close();
        connection?.close();
      }
    }, 10000); // 10 seconds timeout

    await consumeQueue(authenticateQueue, (msg) => {
      if (msg) {
        const messageContent = msg.content.toString();
        console.log("Message received on authenticate queue:", messageContent);

        try {
          const parsedMsg = JSON.parse(messageContent);
          if (parsedMsg.message && parsedMsg.message === "Invalid credentials") {
            console.log("Invalid credentials for email:", email);
            channel.ack(msg); // Acknowledge the message
            clearTimeout(timeout); // Clear timeout

            res.status(401).json({ error: "Invalid credentials" });  // Respond with error
          } else if (parsedMsg.token) {
            console.log("Valid token received:", parsedMsg.token);
            channel.ack(msg); // Acknowledge the message
            clearTimeout(timeout); // Clear timeout

            res.status(200).json({ token: parsedMsg.token });  // Send token if valid
          } else {
            console.error("Unexpected message format received.");
            channel.ack(msg); // Acknowledge the message
            res.status(500).json({ error: "Unexpected message format" });
          }
        } catch (error) {
          console.error("Error parsing message:", error);
          res.status(500).json({ error: "Internal error while processing message" });
        }
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error." });
    await resetState();  // Reset on error as well
  }
}
