// MqttHandler.ts
import mqtt, { MqttClient } from 'mqtt';

interface MqttHandlerOptions {
    host: string;
    username: string;
    password: string;
    clientId: string;
}

class MqttHandler {
    private mqttClient: MqttClient | null = null;
    private host: string;
    private username: string;
    private password: string;
    private clientId: string;

    constructor({ host, username, password, clientId }: MqttHandlerOptions) {
        this.host = host;
        this.username = username;
        this.password = password;
        this.clientId = clientId;
    }

    connect(): void {
        this.mqttClient = mqtt.connect(this.host, {
            username: this.username,
            password: this.password,
            clientId: this.clientId,
            reconnectPeriod: 1000,
        });

        this.mqttClient.on('error', (err: Error) => {
            console.error(`Error on client ${this.clientId}:`, err.message);
            this.mqttClient?.end();
        });

        this.mqttClient.on('connect', () => {
            console.log(`MQTT client ${this.clientId} connected to ${this.host}`);
        });

        this.mqttClient.on('close', () => {
            console.log(`MQTT client ${this.clientId} disconnected`);
        });
    }

    sendMessage(topic: string, message: string): void {
        if (!this.mqttClient || !this.mqttClient.connected) {
            console.error('Cannot publish message: MQTT client is not connected');
            return;
        }
        this.mqttClient.publish(topic, message, (err?: Error | null) => {
            if (err) {
                console.error(`Failed to publish to topic ${topic}:`, err.message);
            } else {
                console.log(`Message published to topic ${topic}:`, message);
            }
        });
    }

    subscribeTopic(topic: string): void {
        if (!this.mqttClient || !this.mqttClient.connected) {
            console.error('Cannot subscribe: MQTT client is not connected');
            return;
        }

        this.mqttClient.subscribe(topic, (err: Error | null | undefined) => {
            if (err) {
                console.error(`Failed to subscribe to topic ${topic}:`, err.message);
            } else {
                console.log(`Subscribed to topic ${topic}`);
            }
        });
    }

    // Getter method for mqttClient
    public getClient(): MqttClient | null {
        return this.mqttClient;
    }
}

export default MqttHandler;
