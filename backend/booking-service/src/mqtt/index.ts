import { MQTTHandler } from './MqttHandler';
import dotenv from 'dotenv';

dotenv.config();

const AMQP_URL = process.env.CLOUDAMQP_URL || '';
const QUEUE_NAME = 'test_queue';

const runMQTTHandler = async () => {
    const handler = new MQTTHandler(AMQP_URL);
    await handler.connect();

    // Publish a message
    await handler.publish(QUEUE_NAME, 'Hello from MQTTHandler!');

    // Subscribe to the queue
    handler.subscribe(QUEUE_NAME, (message) => {
        console.log('Received message:', message);
    });
};

runMQTTHandler().catch((err) => {
    console.error('Error:', err);
});
