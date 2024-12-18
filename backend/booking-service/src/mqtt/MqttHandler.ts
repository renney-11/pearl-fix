import amqplib from 'amqplib';

export class MQTTHandler {
  private connection!: amqplib.Connection;
  private channel!: amqplib.Channel;
  private connected: boolean = false; // Flag to track connection status

  constructor(private amqpUrl: string) {}

  // Connect to RabbitMQ and set connected flag to true
  async connect() {
    try {
      this.connection = await amqplib.connect(this.amqpUrl);
      this.channel = await this.connection.createChannel();
      this.connected = true; // Set to true when connected
      console.log("Connected to RabbitMQ");
    } catch (error) {
      console.error("Error connecting to RabbitMQ:", error);
      throw error;
    }
  }

  // Publish a message to a queue
  async publish(queue: string, message: string) {
    if (!this.connected) {
      throw new Error("Not connected to RabbitMQ");
    }
    if (!this.channel) {
      throw new Error("Channel is not initialized");
    }
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.sendToQueue(queue, Buffer.from(message));
    console.log(`Published message to "${queue}": ${message}`);
  }

  // Subscribe to a queue and handle messages
  async subscribe(queue: string, callback: (msg: string) => void) {
    if (!this.connected) {
      throw new Error("Not connected to RabbitMQ");
    }
    if (!this.channel) {
      throw new Error("Channel is not initialized");
    }
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.consume(queue, (msg) => {
      if (msg) {
        const content = msg.content.toString();
        callback(content);
        this.channel.ack(msg);
      }
    });
    console.log(`Subscribed to queue "${queue}"`);
  }

  // Close the connection and channel, and set connected flag to false
  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.connected = false; // Set to false when disconnected
    console.log("Closed RabbitMQ connection");
  }

  // Check if the connection is active
  isConnected() {
    return this.connected;
  }
}
