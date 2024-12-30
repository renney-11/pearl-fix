import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel } from "amqplib";

// Initial cache setup
let timeSlotsCache: { clinicId: string | null; timeSlots: any[] } = {
  clinicId: null,
  timeSlots: [],
};

// Function to handle subscribing to the RabbitMQ queue for availabilities
async function subscribeToAvailabilitiesQueue(channel: Channel) {
  const availabilityAllQueue = "pearl-fix/availability/clinic/all";
  await channel.assertQueue(availabilityAllQueue, { durable: true });

  // Promise to wait for the updated time slots
  return new Promise<void>((resolve, reject) => {
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

              console.log("Updated timeSlotsCache:", timeSlotsCache);
              resolve();
            }

            channel.ack(msg); // Acknowledge the message
          } catch (error) {
            console.error("Error parsing message:", error);
            reject(error);
          }
        }
      },
      { noAck: false }
    );
  });
}

// Function to initialize the RabbitMQ connection
async function getAmqpChannel() {
  const connection = await amqp.connect(
    "amqps://lvjalbhx:gox3f2vN7d06gUQnOVVizj36Rek93da6@hawk.rmq.cloudamqp.com/lvjalbhx"
  );
  const channel = await connection.createChannel();
  return channel;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const channel = await getAmqpChannel();

      // Wait for the availability message to update the cache
      await subscribeToAvailabilitiesQueue(channel);

      console.log("Returning updated timeSlotsCache:", timeSlotsCache);
      res.status(200).json(timeSlotsCache);

      // Close the channel after the request is handled
    } catch (error) {
      console.error("Error processing GET request:", error);
      res.status(500).json({ error: "Internal server error" });
    }
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

      // Simulate slower POST request by adding a delay
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay for 1 second

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
