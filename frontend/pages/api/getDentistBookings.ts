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
    patientName: string;
    patientEmail: string;
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
    const getAllBookingsQueue = "pearl-fix/booking/dentist/email";
    await channel.assertQueue(getAllBookingsQueue, { durable: true });

    const { dentistEmail } = req.body;
    console.log(dentistEmail);
    channel.sendToQueue(getAllBookingsQueue, Buffer.from(JSON.stringify({dentistEmail})), {
      persistent: true,
    });

    const responseQueue = "pearl-fix/booking/dentist/all-data";
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
              console.log(message);
              channel.ack(msg);
              clearTimeout(timeout);

              if (message.success) {
                console.log(message);
                resolve(message);
              } else {
                console.log({ success: false, message: "No bookings for dentist." })
                resolve({ success: false, message: "No bookings for dentist." });
              }
            }
          },
          { noAck: false }
        );
      }
    );

    if (bookingsData.success) {
      const enrichedBookings = bookingsData.bookings.map((booking) => ({
        ...booking,
        start: booking.timeSlot?.start,
        end: booking.timeSlot?.end,
      }));
      console.log(enrichedBookings);
      return res.status(200).json({ success: true, bookings: enrichedBookings });
    } else {
      return res.status(200).json({ success: false, message: bookingsData.message });
    }
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