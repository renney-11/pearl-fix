import amqp, { Connection, Channel, ConsumeMessage } from "amqplib";
import { NextApiRequest, NextApiResponse } from "next";

interface Clinic {
  _id: string;
  clinicName: string;
  address: string;
  city: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  openingHours: {
    start: string;
    end: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let connection: Connection | null = null;
  let channel: Channel | null = null;

  try {
    // Connect to RabbitMQ
    connection = await amqp.connect(
      "amqps://lvjalbhx:gox3f2vN7d06gUQnOVVizj36Rek93da6@hawk.rmq.cloudamqp.com/lvjalbhx"
    );
    channel = await connection.createChannel();

    // Publish the message to request all clinics
    const getAllClinicsQueue = "pearl-fix/clinic/get-all";
    await channel.assertQueue(getAllClinicsQueue, { durable: true });

    const payload = {};
    channel.sendToQueue(getAllClinicsQueue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });

    const responseQueue = "pearl-fix/clinic/all-data";
    await channel.assertQueue(responseQueue, { durable: true });

    // Log that we are subscribing to the queue
    console.log("Subscribed to queue:", responseQueue);

    // Wait for the response message and get the latest clinic data
    const clinicsData = await new Promise<Clinic[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (channel) channel.close();
        if (connection) connection.close();
        reject("Timeout waiting for clinic data.");
      }, 10000); // 10 seconds timeout

      channel?.consume(
        responseQueue,
        (msg: ConsumeMessage | null) => {
          if (msg !== null) {
            const message = JSON.parse(msg.content.toString());
            
            // Log the clinics received
            console.log("Clinics received from 'pearl-fix/clinic/all-data':", message.clinics);

            // Discard any old messages (optional: check for timestamp or other deduplication logic)
            if (message.clinics.length > 0) {
              clearTimeout(timeout);
              resolve(message.clinics); // Resolve with the new clinic data
              channel?.ack(msg); // Acknowledge the message (mark it as processed)
            }
          }
        },
        { noAck: false } // Acknowledge messages manually (helps prevent duplicates)
      );
    });

    // If clinicsData is empty, handle it appropriately
    if (!clinicsData || clinicsData.length === 0) {
      return res.status(404).json({ error: "No clinics found" });
    }

    // Process clinics data asynchronously (adding extra details if needed)
    const processedClinics = await Promise.all(
      clinicsData.map(async (clinic) => {
        // Example of async processing: adding extra details
        const extraDetails = await fetchExtraDetails(clinic._id); // Example async function
        return { ...clinic, extraDetails };
      })
    );

    // Respond with the processed clinics data
    res.status(200).json({ clinics: processedClinics });

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

// Example async function to fetch additional clinic details
async function fetchExtraDetails(clinicId: string) {
  // Simulate fetching extra details
  return new Promise((resolve) =>
    setTimeout(() => resolve({ rating: 4.5, reviews: 120 }), 100)
  );
}
