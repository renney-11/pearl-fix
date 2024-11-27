import { NextApiRequest, NextApiResponse } from "next";
import amqp from "amqplib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body;

  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(
      "amqps://lvjalbhx:gox3f2vN7d06gUQnOVVizj36Rek93da6@hawk.rmq.cloudamqp.com/lvjalbhx"
    );
    const channel = await connection.createChannel();

    // Ensure the queue exists
    const loginQueue = "tooth-beacon/authentication/login";
    await channel.assertQueue(loginQueue, { durable: true });

    const payload = {
      email,
      password,
    };
    channel.sendToQueue(loginQueue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    console.log("Message published:", payload);

    const authenticateQueue = "tooth-beacon/authentication/authenticate";
    await channel.assertQueue(authenticateQueue, { durable: true });

    console.log("Waiting for token...");
    const token = await new Promise<string | null>((resolve, reject) => {
      const timeout = setTimeout(() => {
        channel.close();
        connection.close();
        reject("Timeout waiting for token.");
      }, 10000); // Wait up to 10 seconds

      channel.consume(
        authenticateQueue,
        (msg) => {
          if (msg !== null) {
            const message = JSON.parse(msg.content.toString());
            channel.ack(msg);
            clearTimeout(timeout);
            channel.close();
            connection.close();
            resolve(message.token || null);
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
  }
}