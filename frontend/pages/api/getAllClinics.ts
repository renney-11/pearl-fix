import { NextApiRequest, NextApiResponse } from "next";
import amqp from "amqplib";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(
      "amqps://lvjalbhx:gox3f2vN7d06gUQnOVVizj36Rek93da6@hawk.rmq.cloudamqp.com/lvjalbhx"
    );
    const channel = await connection.createChannel();

    // Publish the message to request all clinics
    const getAllClinicsQueue = "tooth-beacon/clinic/get-all";
    await channel.assertQueue(getAllClinicsQueue, { durable: true });

    const payload = {};
    channel.sendToQueue(getAllClinicsQueue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });
    console.log("Published message to request all clinics");

    const responseQueue = "tooth-beacon/clinic/all-data";
    await channel.assertQueue(responseQueue, { durable: true });

    console.log("Waiting for clinic data...");

    // Wait for the response message
    const clinicsData = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        channel.close();
        connection.close();
        reject("Timeout waiting for clinic data.");
      }, 10000);

      channel.consume(
        responseQueue,
        (msg) => {
          if (msg !== null) {
            const message = JSON.parse(msg.content.toString());
            channel.ack(msg);
            clearTimeout(timeout);
            channel.close();
            connection.close();
            resolve(message.clinics || []);
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
  }
}