import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";

// Initial cache setup
let emailCache: { token: string | null; email: string | null } = {
  token: null,
  email: null,
};

let connection: Connection | null = null;
let channel: Channel | null = null;

// Function to establish a RabbitMQ connection
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

// Ensure the queue exists
async function setupQueue(queueName: string) {
  if (!channel) throw new Error("Channel is not initialized");
  await channel.assertQueue(queueName, { durable: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  const requestQueue = "pearl-fix/authentication/verify-patient";
  const responseQueue = "pearl-fix/authentication/verify-patient/email";
  let responseSent = false;

  try {
    const { connection, channel } = await connectRabbitMQ();

    // Publish the token to the request queue
    await setupQueue(requestQueue);
    channel.sendToQueue(requestQueue, Buffer.from(JSON.stringify({ token })), {
      persistent: true,
    });
    console.log("Message published to queue:", { token });

    // Set a timeout for waiting on the response
    const timeout = setTimeout(() => {
      if (!responseSent) {
        responseSent = true;
        console.error("Timeout waiting for email.");
        res.status(500).json({ error: "Failed to receive email." });
        cleanup(channel, connection);
      }
    }, 15000); // 15 seconds timeout

    // Consume the response queue for the email
    await setupQueue(responseQueue);
    channel.consume(
      responseQueue,
      (msg) => {
        if (msg) {
          const message = JSON.parse(msg.content.toString());
          console.log("Message received from response queue:", message);

          if (!responseSent) {
            if (message.email) {
              // Cache the email with the associated token
              emailCache = {
                token,
                email: message.email,
              };
              responseSent = true;
              clearTimeout(timeout);
              channel.ack(msg); // Acknowledge the message
              res.status(200).json({ email: message.email });
              cleanup(channel, connection);
            } else {
              console.error("Invalid message format:", message);
              channel.ack(msg);
              res.status(500).json({ error: "Invalid message format." });
              cleanup(channel, connection);
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
    cleanup(channel, connection);
  }
}

// Cleanup function for safely closing RabbitMQ connections and channels
async function cleanup(channel: Channel | null, connection: Connection | null) {
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
