import amqplib from 'amqplib';

export class MQTTHandler {
  private connection!: amqplib.Connection;
  private channel!: amqplib.Channel;

  constructor(private amqpUrl: string) {}

  async connect() {
    this.connection = await amqplib.connect(this.amqpUrl);
    this.channel = await this.connection.createChannel();
    console.log("Connected to RabbitMQ");
  }

  async publish(queue: string, message: string) {
    if (!this.channel) {
      throw new Error("Channel is not initialized");
    }
    await this.channel.assertQueue(queue, { durable: true });
    this.channel.sendToQueue(queue, Buffer.from(message));
    console.log(`Published message to "${queue}": ${message}`);
  }

  async subscribe(queue: string, callback: (msg: string) => void) {
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

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    console.log("Closed RabbitMQ connection");
  }
}
