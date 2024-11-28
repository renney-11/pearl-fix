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

    // Publish request to get-all-clinics queue
    const requestQueue = "tooth-beacon/clinics/get-all";
    await channel.assertQueue(requestQueue, { durable: true });
    channel.sendToQueue(requestQueue, Buffer.from(JSON.stringify({}))); // Empty payload

    console.log("Message published to get-all-clinics queue.");

    // Wait for the response
    const responseQueue = "tooth-beacon/clinics/response";
    await channel.assertQueue(responseQueue, { durable: true });

    const clinics = await new Promise<any[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        channel.close();
        connection.close();
        reject("Timeout waiting for clinic data.");
      }, 10000); // 10 seconds timeout

      channel.consume(
        responseQueue,
        (msg) => {
          if (msg !== null) {
            const response = JSON.parse(msg.content.toString());
            channel.ack(msg);
            clearTimeout(timeout);
            channel.close();
            connection.close();
            if (response.clinics) {
              resolve(response.clinics);
            } else {
              reject(response.message || "Error fetching clinics.");
            }
          }
        },
        { noAck: false }
      );
    });

    // Send the clinics as a response
    res.status(200).json({ clinics });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}