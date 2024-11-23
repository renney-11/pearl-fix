"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// MqttHandler.ts
const mqtt_1 = __importDefault(require("mqtt"));
class MqttHandler {
    constructor({ host, username, password, clientId }) {
        this.mqttClient = null;
        this.host = host;
        this.username = username;
        this.password = password;
        this.clientId = clientId;
    }
    connect() {
        this.mqttClient = mqtt_1.default.connect(this.host, {
            username: this.username,
            password: this.password,
            clientId: this.clientId,
            reconnectPeriod: 1000,
        });
        this.mqttClient.on('error', (err) => {
            var _a;
            console.error(`Error on client ${this.clientId}:`, err.message);
            (_a = this.mqttClient) === null || _a === void 0 ? void 0 : _a.end();
        });
        this.mqttClient.on('connect', () => {
            console.log(`MQTT client ${this.clientId} connected to ${this.host}`);
        });
        this.mqttClient.on('close', () => {
            console.log(`MQTT client ${this.clientId} disconnected`);
        });
    }
    sendMessage(topic, message) {
        if (!this.mqttClient || !this.mqttClient.connected) {
            console.error('Cannot publish message: MQTT client is not connected');
            return;
        }
        this.mqttClient.publish(topic, message, (err) => {
            if (err) {
                console.error(`Failed to publish to topic ${topic}:`, err.message);
            }
            else {
                console.log(`Message published to topic ${topic}:`, message);
            }
        });
    }
    subscribeTopic(topic) {
        if (!this.mqttClient || !this.mqttClient.connected) {
            console.error('Cannot subscribe: MQTT client is not connected');
            return;
        }
        this.mqttClient.subscribe(topic, (err) => {
            if (err) {
                console.error(`Failed to subscribe to topic ${topic}:`, err.message);
            }
            else {
                console.log(`Subscribed to topic ${topic}`);
            }
        });
    }
    // Getter method for mqttClient
    getClient() {
        return this.mqttClient;
    }
}
exports.default = MqttHandler;
