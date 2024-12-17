import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel } from "amqplib";

let timeSlotsCache: { clinicId: string | null; timeSlots: any[] } = {
  clinicId: null,
  timeSlots: [],
};

let isCacheUpdated = false; // Tracks if the cache has been updated

// Function to handle subscribing to the RabbitMQ queue for availabilities
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

            if (data.status === "success" && Array.isArray(data.timeSlots)) {
              // Update the cache with new data
              timeSlotsCache = {
                clinicId: data.clinicId || null,
                timeSlots: data.timeSlots.map((slot: any) => ({
                  start: new Date(slot.start).toISOString(),
                  end: new Date(slot.end).toISOString(),
                  status: slot.status,
                })),
              };
              isCacheUpdated = true; // Mark cache as updated
              console.log("Updated timeSlotsCache:", timeSlotsCache);
            }

            channel.ack(msg); // Acknowledge the message
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

// Run the RabbitMQ subscription on server startup
subscribeToAvailabilitiesQueue().catch((error) =>
  console.error("Subscription failed:", error)
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // If cache hasn't been updated, return the cached data (even if empty)
    res.status(200).json(timeSlotsCache);

  } else if (req.method === "POST") {
    const { clinicId, date, time } = req.body;

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

        const payload = { date, time, clinicId };
        channel.sendToQueue(bookingQueue, Buffer.from(JSON.stringify(payload)), {
          persistent: true,
        });

        console.log("Booking published:", payload);
      }

      // Simulate saving the time slots if available
      if (clinicId) {
        // Here we just mock the availability data to simulate the change in cache
        timeSlotsCache = {
          clinicId: clinicId,
          timeSlots: [
            {
              start: new Date().toISOString(),
              end: new Date(new Date().getTime() + 30 * 60 * 1000).toISOString(),
              status: "available",
            },
            {
              start: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
              end: new Date(new Date().getTime() + 90 * 60 * 1000).toISOString(),
              status: "available",
            },
          ],
        };
        isCacheUpdated = true;
        console.log("Time slots updated in cache after POST:", timeSlotsCache);
      }

      res.status(200).json({ message: "Clinic ID and booking information sent." });
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
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
