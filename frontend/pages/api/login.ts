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
    const queue = "tooth-beacon/authentication/login";
    await channel.assertQueue(queue, { durable: true });

    // Prepare the payload
    const payload = {
      email,
      password,
    };

    // Send the message to the queue
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });

    console.log("Message published:", payload);

    // Close the connection
    setTimeout(() => {
      channel.close();
      connection.close();
    }, 500);

    res.status(200).json({ message: "Login data sent successfully!" });
  } catch (error) {
    console.error("Error connecting to RabbitMQ:", error);
    res.status(500).json({ error: "Failed to send login data." });
  }
}
