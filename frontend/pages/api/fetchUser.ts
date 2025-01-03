import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";

let connection: Connection | null = null;
let channel: Channel | null = null;

async function connectRabbitMQ() {
  if (!connection) {
    connection = await amqp.connect(
      "amqps://lvjalbhx:gox3f2vN7d06gUQnOVVizj36Rek93da6@hawk.rmq.cloudamqp.com/lvjalbhx"
    );
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

  const { token } = req.body;

  try {
    const { connection, channel } = await connectRabbitMQ();
    const queue = "pearl-fix/authentication/verify-patient";
    const responseQueue = "pearl-fix/authentication/verify-patient/email";

    // Publish login data
    const payload = { token };
    await setupQueue(queue);
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    console.log("Message published:", payload);

    // Consume the authentication queue
    console.log("Listening for email on authenticate queue...");
    await setupQueue(responseQueue);

    let emailReceived = false;

    // Create a timeout to handle errors if no email is received
    const timeout = setTimeout(() => {
      if (!emailReceived) {
        console.error("Timeout waiting for email.");
        res.status(500).json({ error: "Failed to receive email." });
        cleanup();
      }
    }, 10000); // 10 seconds timeout

    // Consume messages from the response queue
    await consumeQueue(responseQueue, (msg) => {
      if (msg) {
        const message = JSON.parse(msg.content.toString());
        if (message.email) {
          console.log("Email received:", message.email);
          emailReceived = true;
          clearTimeout(timeout); // Clear the timeout once we receive the email
          channel.ack(msg); // Acknowledge the message
          res.status(200).json({ email: message.email });
          cleanup();
        }
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error." });
    cleanup();
  }

  // Helper function to clean up connections and channels
  function cleanup() {
    if (channel) {
      channel.close().catch(console.error); // Close the channel
    }
    if (connection) {
      connection.close().catch(console.error); // Close the connection
    }
  }
}
