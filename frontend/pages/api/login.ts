import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel } from "amqplib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;
  let connection: Connection | null = null;
  let channel: Channel | null = null;

  try {
    // Connect to RabbitMQ
    connection = await amqp.connect(
      "amqps://lvjalbhx:gox3f2vN7d06gUQnOVVizj36Rek93da6@hawk.rmq.cloudamqp.com/lvjalbhx"
    );
    channel = await connection.createChannel();

    // Ensure the login queue exists
    const loginQueue = "pearl-fix/authentication/login";
    await channel.assertQueue(loginQueue, { durable: true });

    const payload = {
      email,
      password,
    };
    channel.sendToQueue(loginQueue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    console.log("Message published:", payload);

    const authenticateQueue = "pearl-fix/authentication/authenticate";
    await channel.assertQueue(authenticateQueue, { durable: true });

    console.log("Waiting for token...");
    const token = await new Promise<string | null>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (channel) channel.close();
        if (connection) connection.close();
        // Timeout: Reject if no message received within 10 seconds
        reject("Timeout waiting for token.");
      }, 10000); // Wait up to 10 seconds

      channel?.consume(
        authenticateQueue,
        (msg) => {
          if (msg !== null) {
            const message = JSON.parse(msg.content.toString());
            channel?.ack(msg); // Acknowledge the message
            clearTimeout(timeout); // Clear the timeout since the message was received
            resolve(message.token || null); // Resolve the token
          }
        },
        { noAck: false }
      );
    });

    if (!token) {
      return res.status(500).json({ error: "Failed to receive token." });
    }

    // Respond with the token
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error." });
  } finally {
    // Ensure the connection and channel are always closed
    try {
      // Safely close channel and connection if they are not null
      await channel?.close();
      await connection?.close();
    } catch (err) {
      console.error("Error closing channel or connection:", err);
    }
  }
}
