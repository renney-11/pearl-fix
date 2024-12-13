import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";
import { NextApiRequest, NextApiResponse } from "next";

interface SlotData {
  date: string;
  availableSlots: string[];
  unavailableSlots: string[];
  token: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { date, availableSlots, unavailableSlots, token } = req.body;

  let connection: Connection | null = null;
  let channel: Channel | null = null;

  try {
    // Connect to RabbitMQ
    connection = await amqp.connect(
      "amqps://lvjalbhx:gox3f2vN7d06gUQnOVVizj36Rek93da6@hawk.rmq.cloudamqp.com/lvjalbhx"
    );
    channel = await connection.createChannel();

    // Publish the message to set the availability
    const setAvailabilityQueue = "pearl-fix/availability/set";
    await channel.assertQueue(setAvailabilityQueue, { durable: true });

    const payload: SlotData = {
      date,
      availableSlots,
      unavailableSlots,
      token, // Including the token in the message
    };

    channel.sendToQueue(setAvailabilityQueue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    console.log("Published message to set availability", payload);

    const responseQueue = "pearl-fix/availability/confirmation";
    await channel.assertQueue(responseQueue, { durable: true });

    console.log("Waiting for confirmation...");

    // Wait for the response message
    const confirmation = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (channel) channel.close();
        if (connection) connection.close();
        reject("Timeout waiting for confirmation.");
      }, 10000); // 10 seconds timeout

      channel?.consume(
        responseQueue,
        (msg: ConsumeMessage | null) => {
          if (msg !== null) {
            const message = JSON.parse(msg.content.toString());
            console.log("Received confirmation:", message);

            // If a confirmation message is received, resolve the promise
            clearTimeout(timeout);
            resolve(message.status); // Resolve with the status received from the queue
          }
        },
        { noAck: false }
      );
    });

    // Respond with the confirmation status
    res.status(200).json({ status: confirmation });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    // Ensure the connection and channel are closed
    try {
      if (channel) await channel.close();
      if (connection) await connection.close();
    } catch (error) {
      console.error("Error closing connection/channel:", error);
    }
  }
}
