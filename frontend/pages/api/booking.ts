import { NextApiRequest, NextApiResponse } from "next";
import amqp, { Connection, Channel } from "amqplib";

let availabilityData: any = null; // Store the data directly from the response topic

// Function to handle subscribing to the RabbitMQ queue for availabilities (clinic/all)
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

            // If the response is valid, update the availability data
            if (data.status === "success" && Array.isArray(data.timeSlots)) {
              availabilityData = {
                clinicId: data.clinicId || null,
                timeSlots: data.timeSlots.map((slot: any) => ({
                  start: new Date(slot.start).toISOString(),
                  end: new Date(slot.end).toISOString(),
                  status: slot.status,
                })),
              };
              console.log("Updated availabilityData:", availabilityData);
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
    console.error("Error subscribing to availability all queue:", error);
  }
}

// Function to handle subscribing to the RabbitMQ queue for clinic-id responses
async function subscribeToClinicIdResponseQueue() {
  try {
    const connection = await amqp.connect(
      "amqps://lvjalbhx:gox3f2vN7d06gUQnOVVizj36Rek93da6@hawk.rmq.cloudamqp.com/lvjalbhx"
    );
    const channel = await connection.createChannel();

    const availabilityClinicIdResponseQueue = "pearl-fix/availability/clinic-id/response";
    await channel.assertQueue(availabilityClinicIdResponseQueue, { durable: true });

    channel.consume(
      availabilityClinicIdResponseQueue,
      (msg) => {
        if (msg) {
          try {
            const data = JSON.parse(msg.content.toString());
            console.log("Message received on 'pearl-fix/availability/clinic-id/response':", data);

            // If the response is valid, update the availability data
            if (data.status === "success" && data.clinicId) {
              availabilityData = {
                clinicId: data.clinicId,
                timeSlots: data.availability.map((slot: any) => ({
                  start: new Date(slot.start).toISOString(),
                  end: new Date(slot.end).toISOString(),
                  status: slot.status,
                })),
              };
              console.log("Updated availabilityData from response:", availabilityData);
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
    console.error("Error subscribing to availability clinic-id response queue:", error);
  }
}

// Run the RabbitMQ subscriptions on server startup
subscribeToAvailabilitiesQueue().catch((error) =>
  console.error("Subscription failed for 'pearl-fix/availability/clinic/all':", error)
);

subscribeToClinicIdResponseQueue().catch((error) =>
  console.error("Subscription failed for 'pearl-fix/availability/clinic-id/response':", error)
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // Directly return the availability data from the response topic, not the cache
    if (availabilityData) {
      res.status(200).json(availabilityData);
    } else {
      res.status(200).json({ message: "No availability data received yet." });
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

      // Publish clinicId to 'pearl-fix/availability/clinic-id'
      const availabilityQueue = "pearl-fix/availability/clinic-id";
      await channel.assertQueue(availabilityQueue, { durable: true });

      channel.sendToQueue(
        availabilityQueue,
        Buffer.from(JSON.stringify({ clinicId })),
        { persistent: true } // Ensure the message is persistent
      );
      console.log("ClinicID sent to availability queue:", clinicId);

      // Optionally handle booking if 'date' and 'time' are provided
      if (date && time) {
        const bookingQueue = "pearl-fix/booking/date-time";
        await channel.assertQueue(bookingQueue, { durable: true });

        const payload = { date, time, clinicId };
        channel.sendToQueue(bookingQueue, Buffer.from(JSON.stringify(payload)), {
          persistent: true,
        });

        console.log("Booking published:", payload);
      }

      // Publish clinicId to 'pearl-fix/availability/get/clinic-id'
      const getAvailabilityQueue = "pearl-fix/availability/get/clinic-id";
      await channel.assertQueue(getAvailabilityQueue, { durable: true });

      channel.sendToQueue(
        getAvailabilityQueue,
        Buffer.from(JSON.stringify({ clinicId })),
        { persistent: true } // Ensure the message is persistent
      );
      console.log("ClinicID sent to get availability queue:", clinicId);

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
