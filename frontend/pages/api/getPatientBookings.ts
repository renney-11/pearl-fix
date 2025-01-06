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

    console.log(`Subscribed to queue: "${responseQueue}"`);

    // Wait for the response message and get the booking data
    const bookingsData = await new Promise<{ success: boolean; message: string; bookings: Booking[] }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (channel) channel.close();
        if (connection) connection.close();
        reject(new Error("Timeout waiting for booking data."));
      }, 10000); // 10 seconds timeout

      channel.consume(
        responseQueue,
        (msg: ConsumeMessage | null) => {
          if (msg) {
            const message = JSON.parse(msg.content.toString());
            console.log("Message received from queue:", message);

            if (message.success) {
              clearTimeout(timeout);
              channel.ack(msg);
              resolve(message);
            } else {
              clearTimeout(timeout);
              channel.ack(msg);
              reject(new Error(message.message || "Failed to retrieve bookings."));
            }
          }
        },
        { noAck: false } // Acknowledge messages manually
      );
    });

    // Respond with the bookings data
    res.status(200).json({ bookings: bookingsData.bookings });
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