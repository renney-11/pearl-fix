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
    console.log("Published message to request all clinics");

    const responseQueue = "pearl-fix/clinic/all-data";
    await channel.assertQueue(responseQueue, { durable: true });

    console.log("Waiting for clinic data...");

    // Wait for the response message
    const clinicsData = await new Promise<Clinic[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (channel) channel.close();
        if (connection) connection.close();
        reject("Timeout waiting for clinic data.");
      }, 10000); // 10 seconds timeout

      const allClinics: Clinic[] = []; // Define this as an array of Clinic objects

      channel?.consume(
        responseQueue,
        (msg: ConsumeMessage | null) => {
          if (msg !== null) {
            const message = JSON.parse(msg.content.toString());
            console.log("Received clinic data:", message.clinics);

            // Add the clinics data to the array
            allClinics.push(...message.clinics);

            // If we expect all clinic data in one message, resolve the promise here
            clearTimeout(timeout);
            resolve(allClinics); // Resolve with all the clinics received
          }
        },
        { noAck: false }
      );
    });

    // Respond with the clinics data
    res.status(200).json({ clinics: clinicsData });

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