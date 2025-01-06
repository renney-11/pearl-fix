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
    const cancelBookingQueue = "pearl-fix/booking/patient/cancel";
    await channel.assertQueue(cancelBookingQueue, { durable: true });

    const { bookingId, patientEmail } = req.body;
    console.log(bookingId);
    console.log(patientEmail);
    channel.sendToQueue(cancelBookingQueue, Buffer.from(JSON.stringify({bookingId, patientEmail})), {
      persistent: true,
    });

    const responseQueue = "pearl-fix/booking/patient/cancel/authenticate";
    await channel.assertQueue(responseQueue, { durable: true });

    const bookingsData = await new Promise<{ success: boolean; message: string; bookings?: Booking[] }>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          if (channel) channel.close();
          if (connection) connection.close();
          reject(new Error("Timeout waiting for booking data."));
        }, 10000);

        channel.consume(
          responseQueue,
          (msg: ConsumeMessage | null) => {
            if (msg) {
              const message = JSON.parse(msg.content.toString());
              channel.ack(msg);
              clearTimeout(timeout);

              if (message.success) {
                console.log(message);
                resolve(message);
              } else {
                console.log({ success: false, message: "No success in cancelling booking." })
                resolve({ success: false, message: "No success in cancelling booking." });
              }
            }
          },
          { noAck: false }
        );
      }
    );

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  } finally {
    try {
      if (channel) await channel.close();
      if (connection) await connection.close();
    } catch (error) {
      console.error("Error closing connection/channel:", error);
    }
  }
}