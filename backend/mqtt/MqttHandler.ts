import amqplib from 'amqplib';

export class MQTTHandler {
    private connection!: amqplib.Connection;
    private channel!: amqplib.Channel;

    constructor(private amqpUrl: string) {}

    async connect() {
        this.connection = await amqplib.connect(this.amqpUrl);
        this.channel = await this.connection.createChannel();
        console.log('Connected to RabbitMQ');
    }

    async publish(queue: string, message: string) {
        await this.channel.assertQueue(queue, { durable: true });
        this.channel.sendToQueue(queue, Buffer.from(message));
        console.log(`Published message to "${queue}": ${message}`);
    }

    async subscribe(queue: string, callback: (msg: string) => void) {
        await this.channel.assertQueue(queue, { durable: true });
        console.log(`Subscribed to queue "${queue}"`);
        this.channel.consume(queue, (msg) => {
            if (msg) {
                const content = msg.content.toString();
                callback(content);
                this.channel.ack(msg);
            }
        });
    }

    async close() {
        await this.channel.close();
        await this.connection.close();
        console.log('Closed RabbitMQ connection');
    }
}
