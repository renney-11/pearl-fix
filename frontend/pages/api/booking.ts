import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel } from "amqplib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { date, time } = req.body;
  let connection: Connection | null = null;
  let channel: Channel | null = null;

  try {
    connection = await amqp.connect(
      "amqps://lvjalbhx:gox3f2vN7d06gUQnOVVizj36Rek93da6@hawk.rmq.cloudamqp.com/lvjalbhx"
    );
    channel = await connection.createChannel();

    const queue = "pearl-fix/booking/date-time";
    await channel.assertQueue(queue, { durable: true });

    const payload = { date, time };
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });

    console.log("Booking published:", payload);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error publishing booking:", error);
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
