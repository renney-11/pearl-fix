import amqplib from 'amqplib';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env

export class MQTTHandler {
  private connection!: amqplib.Connection;
  private channel!: amqplib.Channel;
  private readonly amqpUrl: string;

  constructor(amqpUrl?: string) {
    this.amqpUrl = amqpUrl || process.env.CLOUDAMQP_URL || 'amqp://localhost';
  }

  async connect() {
    try {
      this.connection = await amqplib.connect(this.amqpUrl);
      this.channel = await this.connection.createChannel();
      console.log(`Connected to RabbitMQ at ${this.amqpUrl}`);
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
      throw error;
    }
  }

  async publish(queue: string, message: string) {
    if (!this.channel) {
      throw new Error("Channel is not initialized. Call 'connect' first.");
    }

    try {
      await this.channel.assertQueue(queue, { durable: true });
      this.channel.sendToQueue(queue, Buffer.from(message));
      console.log(`Published message to "${queue}": ${message}`);
    } catch (error) {
      console.error(`Failed to publish message to "${queue}":`, error);
      throw error;
    }
  }

  async subscribe(queue: string, callback: (msg: string) => void) {
    if (!this.channel) {
      throw new Error("Channel is not initialized. Call 'connect' first.");
    }

    try {
      await this.channel.assertQueue(queue, { durable: true });
      await this.channel.consume(queue, (msg) => {
        if (msg) {
          const content = msg.content.toString();
          callback(content);
          this.channel.ack(msg);
        }
      });
      console.log(`Subscribed to queue "${queue}"`);
    } catch (error) {
      console.error(`Failed to subscribe to queue "${queue}":`, error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      console.log("Closed RabbitMQ connection");
    } catch (error) {
      console.error("Failed to close RabbitMQ connection:", error);
    }
  }
}
