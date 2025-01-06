import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";
import { NextApiRequest, NextApiResponse } from "next";

interface Booking {
    dentistId: string; // Reference to the Dentist
    patientId: string; // Reference to the Patient
    availabilityId: string; // Reference to Availability
    timeSlot: {
      start: Date;
      end: Date;
    };
    status: "available" | "booked";
    clinicId: string; // Reference to the Clinic (optional)
  }
  

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let connection: Connection | null = null;
  let channel: Channel | null = null;

  try {
    // Connect to RabbitMQ
    const amqpUrl = process.env.RABBITMQ_URL || "amqp://localhost";

  // Connect to RabbitMQ
  connection = await amqp.connect(amqpUrl);
  channel = await connection.createChannel();

    // Publish the message to request all clinics
    const getAllBookingsQueue = "pearl-fix/booking/patient/email";
    await channel.assertQueue(getAllBookingsQueue, { durable: true });

    const { patientEmail } = req.body;
    console.log(patientEmail);
    channel.sendToQueue(getAllBookingsQueue, Buffer.from(JSON.stringify({patientEmail})), {
      persistent: true,
    });

    const responseQueue = "pearl-fix/booking/patient/all-data";
    await channel.assertQueue(responseQueue, { durable: true });

    // Log that we are subscribing to the queue
    console.log("Subscribed to queue:", responseQueue);

    // Wait for the response message and get the latest booking data
    const bookingsData = await new Promise<Booking[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (channel) channel.close();
        if (connection) connection.close();
        reject("Timeout waiting for booking data.");
      }, 10000); // 10 seconds timeout

      channel?.consume(
        responseQueue,
        (msg: ConsumeMessage | null) => {
          if (msg !== null) {
            const message = JSON.parse(msg.content.toString());
            
            // Log the clinics received
            console.log("Clinics received from 'pearl-fix/booking/patient/all-data':", message.bookings);

            // Discard any old messages (optional: check for timestamp or other deduplication logic)
            if (message.bookings.length > 0) {
              clearTimeout(timeout);
              resolve(message.bookings); // Resolve with the new booking data
              channel?.ack(msg); // Acknowledge the message (mark it as processed)
            }
          }
        },
        { noAck: false } // Acknowledge messages manually (helps prevent duplicates)
      );
    });

    // If bookingsData is empty, handle it appropriately
    if (!bookingsData || bookingsData.length === 0) {
      return res.status(404).json({ error: "No bookings found" });
    }

    // Respond with the processed clinics data
    res.status(200).json({ bookings: bookingsData });

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

