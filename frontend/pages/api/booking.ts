import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel } from "amqplib";

let availabilitiesCache: any = null; // Cache for the latest availabilities

// Subscribe to the "pearl-fix/availability/clinic/all" queue to update the cache
async function subscribeToAvailabilitiesQueue() {
  try {
    const connection = await amqp.connect(
      "amqps://lvjalbhx:gox3f2vN7d06gUQnOVVizj36Rek93da6@hawk.rmq.cloudamqp.com/lvjalbhx"
    );
    const channel = await connection.createChannel();

    const availabilityAllQueue = "pearl-fix/availability/clinic/all";
    await channel.assertQueue(availabilityAllQueue, { durable: true });

    channel.consume(
      availabilityAllQueue,
      (msg) => {
        if (msg) {
          try {
            const data = JSON.parse(msg.content.toString());
            console.log("Message received on 'pearl-fix/availability/clinic/all':", data);
            availabilitiesCache = data; // Update the cache with the latest data
            channel.ack(msg);
          } catch (error) {
            console.error("Error parsing message:", error);
          }
        }
      },
      { noAck: false }
    );
  } catch (error) {
    console.error("Error subscribing to availabilities queue:", error);
  }
}

// Ensure the subscription runs on server startup
subscribeToAvailabilitiesQueue().catch((error) =>
  console.error("Subscription failed:", error)
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { clinicId, date, time } = req.body; // Extract clinicId from the request body

    if (!clinicId) {
      return res.status(400).json({ error: "Clinic ID is required." });
    }

    let connection: Connection | null = null;
    let channel: Channel | null = null;

    try {
      connection = await amqp.connect(
        "amqps://lvjalbhx:gox3f2vN7d06gUQnOVVizj36Rek93da6@hawk.rmq.cloudamqp.com/lvjalbhx"
      );
      channel = await connection.createChannel();

      const availabilityQueue = "pearl-fix/availability/clinic-id";
      await channel.assertQueue(availabilityQueue, { durable: true });

      // Send clinicId to the queue
      channel.sendToQueue(
        availabilityQueue,
        Buffer.from(JSON.stringify({ clinicId })),
        { persistent: true }
      );
      console.log("ClinicID sent to availability queue:", clinicId);

      if (date && time) {
        const bookingQueue = "pearl-fix/booking/date-time";
        await channel.assertQueue(bookingQueue, { durable: true });

        const payload = { date, time, clinicId }; // Include clinicId in the payload
        channel.sendToQueue(bookingQueue, Buffer.from(JSON.stringify(payload)), {
          persistent: true,
        });

        console.log("Booking published:", payload);
      }

      res.status(200).json({ message: "Clinic ID sent to availability service." });
    } catch (error) {
      console.error("Error publishing booking:", error);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      try {
        if (channel) await channel.close();
        if (connection) await connection.close();
      } catch (error) {
        console.error("Error closing connection/channel:", error);
      }
    }
  } else if (req.method === "GET") {
    // Return cached availabilities
    try {
      if (!availabilitiesCache) {
        return res.status(404).json({ message: "No availabilities found." });
      }

      res.status(200).json(availabilitiesCache);
    } catch (error) {
      console.error("Error fetching availabilities:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
