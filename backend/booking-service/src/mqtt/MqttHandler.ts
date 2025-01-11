import amqplib from 'amqplib';
import dotenv from 'dotenv';
import { Message } from 'amqplib';

dotenv.config(); // Load environment variables from .env

export class MQTTHandler {
  private connection!: amqplib.Connection;
  private channel!: amqplib.Channel;

  constructor(private amqpUrl: string = process.env.CLOUDAMQP_URL || 'amqp://localhost') {}

  async connect() {
    try {
      this.connection = await amqplib.connect(this.amqpUrl);
      this.channel = await this.connection.createChannel();
      console.log("Connected to RabbitMQ at", this.amqpUrl);

      // Set up event listeners for the connection and channel
      this.channel.on('error', (err) => {
        console.error('Channel error:', err);
      });

      this.connection.on('error', (err) => {
        console.error('Connection error:', err);
      });

      this.connection.on('close', () => {
        console.error('Connection closed');
      });
    } catch (error) {
      console.error("Failed to connect to RabbitMQ:", error);
      throw error;
    }
  }

  async publish(queue: string, message: string) {
    if (!this.channel) {
      throw new Error("Channel is not initialized");
    }

    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.sendToQueue(queue, Buffer.from(message));
    console.log(`Published message to "${queue}": ${message}`);
  }

  async subscribe(queue: string, callback: (msg: string) => void) {
    if (!this.channel) {
      throw new Error("Channel is not initialized");
    }

    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.consume(queue, (msg) => {
      if (msg) {
        const content = msg.content.toString();
        callback(content);
        this.channel.ack(msg);
      }
    });
    console.log(`Subscribed to queue "${queue}"`);
  }

  async subscribeWithIsolation(queue: string, callback: (msg: Message, channel: amqplib.Channel) => void): Promise<void> {
    const isolatedChannel = await this.connection.createChannel();
  
    // Handle channel errors
    isolatedChannel.on('error', (err) => {
      console.error(`Channel error for queue "${queue}":`, err);
    });
  
    await isolatedChannel.assertQueue(queue, { durable: true });
  
    await isolatedChannel.consume(queue, (msg) => {
      if (msg) {
        try {
          callback(msg, isolatedChannel); // Pass the channel to the callback
        } catch (err) {
          console.error("Error in message handler:", err);
          isolatedChannel.ack(msg); // Ensure message acknowledgment even on errors
        }
      }
    });
  
    console.log(`Subscribed with isolation to queue "${queue}"`);
  }
  

  async publishWithIsolation(queue: string, message: string): Promise<void> {
    const isolatedChannel = await this.connection.createChannel();
    try {
      await isolatedChannel.assertQueue(queue, { durable: true });
      await isolatedChannel.sendToQueue(queue, Buffer.from(message));
      console.log(`Published message with isolation to "${queue}": ${message}`);
    } finally {
      await isolatedChannel.close();
    }
  }
  

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    console.log("Closed RabbitMQ connection");
  }
}
