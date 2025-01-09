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
    const amqpUrl = process.env.RABBITMQ_URL || "amqp://localhost";

    // Connect to RabbitMQ
    connection = await amqp.connect(amqpUrl);
    channel = await connection.createChannel();

    const getAllBookingsQueue = "pearl-fix/booking/patient/email";
    await channel.assertQueue(getAllBookingsQueue, { durable: true });

    const { patientEmail } = req.body;
    console.log(patientEmail);
    channel.sendToQueue(getAllBookingsQueue, Buffer.from(JSON.stringify({ patientEmail })), {
      persistent: true,
    });

    const responseQueue = "pearl-fix/booking/patient/all-data";
    await channel.assertQueue(responseQueue, { durable: true });

    const bookingsData = await new Promise<{
      success: boolean;
      message: string;
      bookings?: Booking[];
    }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error("Timeout waiting for booking data.");
        reject(new Error("Timeout waiting for booking data."));
      }, 10000); // 10 seconds timeout
    
      channel.consume(
        responseQueue,
        (msg: ConsumeMessage | null) => {
          if (msg) {
            try {
              const message = JSON.parse(msg.content.toString());
              channel.ack(msg); // Acknowledge message
              clearTimeout(timeout); // Clear timeout
    
              if (message.success) {
                resolve(message);
              } else {
                resolve({ success: false, message: "No bookings made for the specified patient." });
              }
            } catch (error) {
              console.error("Error processing message:", error);
              channel.nack(msg, false, false); // Reject message without requeuing
              reject(error);
            }
          }
        },
        { noAck: false }
      );
    });
    
    if (bookingsData.success) {
      // Ensure bookings is an array, or default to an empty array
      const enrichedBookings = (bookingsData.bookings || []).map((booking) => ({
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
