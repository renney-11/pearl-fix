import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";
import { NextApiRequest, NextApiResponse } from "next";

// Initial cache setup for time slots
let timeSlotsCache: { clinicId: string | null; timeSlots: any[] } = {
  clinicId: null,
  timeSlots: [],
};

// Helper function to initialize RabbitMQ connection and channel
async function getAmqpChannel(): Promise<{ connection: Connection; channel: Channel }> {
  const amqpUrl = process.env.RABBITMQ_URL || "amqp://localhost";
  const connection = await amqp.connect(amqpUrl);
  const channel = await connection.createChannel();
  return { connection, channel };
}

// Function to fetch availability data from RabbitMQ queue and update cache
async function fetchAndUpdateAvailability(channel: Channel): Promise<void> {
  const availabilityQueue = "pearl-fix/availability/clinic/all";
  await channel.assertQueue(availabilityQueue, { durable: true });

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.error("Timeout waiting for availability data.");
      reject(new Error("Timeout waiting for availability data."));
    }, 10000); // 10 seconds timeout

    channel.consume(
      availabilityQueue,
      (msg: ConsumeMessage | null) => {
        if (msg) {
          try {
            const data = JSON.parse(msg.content.toString());
            console.log("Message received on queue:", data);

            if (data.status === "success" && Array.isArray(data.timeSlots)) {
              timeSlotsCache = {
                clinicId: data.clinicId || null,
                timeSlots: data.timeSlots.map((slot: any) => ({
                  start: new Date(slot.start).toISOString(),
                  end: new Date(slot.end).toISOString(),
                  status: slot.status,
                  dentist: slot.dentist,
                })),
              };
              console.log("Updated timeSlotsCache:", timeSlotsCache);

              channel.ack(msg); // Acknowledge the message
              clearTimeout(timeout); // Clear the timeout
              resolve();
            } else {
              console.error("Invalid message structure:", data);
              channel.nack(msg, false, false); // Reject message without requeuing
            }
          } catch (error) {
            console.error("Error processing message:", error);
            channel.nack(msg, false, false); // Reject message without requeuing
          }
        }
      },
      { noAck: false }
    );
  });
}


// Function to send data to RabbitMQ queue
async function sendToQueue(channel: Channel, queue: string, data: any) {
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true });
}

// API handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let connection: Connection | null = null;
  let channel: Channel | null = null;

  try {
    // Initialize RabbitMQ connection and channel
    const amqpSetup = await getAmqpChannel();
    connection = amqpSetup.connection;
    channel = amqpSetup.channel;

    if (req.method === "GET") {
      // Fetch fresh availability data from RabbitMQ and update cache
      await fetchAndUpdateAvailability(channel);
      res.status(200).json(timeSlotsCache);
    } else if (req.method === "POST") {
      const { clinicId, date, time } = req.body;

      if (!clinicId) {
        return res.status(400).json({ error: "Clinic ID is required." });
      }

      // Send clinicId to availability queue
      const availabilityQueue = "pearl-fix/availability/clinic-id";
      await sendToQueue(channel, availabilityQueue, { clinicId });
      console.log("ClinicID sent to availability queue:", clinicId);

      if (date && time) {
        // If booking data is provided, send it to the booking queue
        const bookingQueue = "pearl-fix/booking/date-time";
        const payload = { date, time, clinicId };
        await sendToQueue(channel, bookingQueue, payload);
        console.log("Booking published:", payload);
      }

      res.status(200).json({ message: "Clinic ID and booking information sent." });
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    // Ensure connection and channel are properly closed
    try {
      if (channel) await channel.close();
      if (connection) await connection.close();
    } catch (error) {
      console.error("Error closing RabbitMQ resources:", error);
    }
  }
}
