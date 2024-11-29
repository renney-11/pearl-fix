import { NextApiRequest, NextApiResponse } from "next";
import amqp from "amqplib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { date, time } = req.body;

  try {
    const connection = await amqp.connect(
        "amqps://lvjalbhx:gox3f2vN7d06gUQnOVVizj36Rek93da6@hawk.rmq.cloudamqp.com/lvjalbhx"
    );
    const channel = await connection.createChannel();

    const queue = "pearl-fix/booking/date-time";
    await channel.assertQueue(queue, { durable: true });

    const payload = { date, time };
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });

    console.log("Booking published:", payload);

    await channel.close();
    await connection.close();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error publishing booking:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
