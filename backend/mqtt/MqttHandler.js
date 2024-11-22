const mqtt = require('mqtt');

class MqttHandler {
    constructor(host, username, password, clientId) {
        this.mqttClient = null;
        this.host = host; // HiveMQ broker URL
        this.clientId = clientId; 
        this.username = username;
        this.password = password;
    }

    connect() {
        this.mqttClient = mqtt.connect(this.host, {
            username: this.username,
            password: this.password,
            clientId: this.clientId,
            reconnectPeriod: 1000, // Reconnect every 1 second if the connection is lost
        });

        // MQTT error callback
        this.mqttClient.on('error', (err) => {
            console.error(`Error on client ${this.clientId}:`, err.message);
            this.mqttClient.end();
        });

        // Connection callback
        this.mqttClient.on('connect', () => {
            console.log(`MQTT client ${this.clientId} connected to ${this.host}`);
        });

        // Disconnect callback
        this.mqttClient.on('close', () => {
            console.log(`MQTT client ${this.clientId} disconnected`);
        });
    }

    /**
     * Publishes a message to a topic
     *
     * @param topic - MQTT topic
     * @param message - Message payload
     */
    sendMessage(topic, message) {
        if (!this.mqttClient || !this.mqttClient.connected) {
            console.error('Cannot publish message: MQTT client is not connected');
            return;
        }
        this.mqttClient.publish(topic, message, (err) => {
            if (err) {
                console.error(`Failed to publish to topic ${topic}:`, err.message);
            } else {
                console.log(`Message published to topic ${topic}:`, message);
            }
        });
    }

    /**
     * Subscribes to a topic
     *
     * @param topic - MQTT topic
     */
    subscribeTopic(topic) {
        if (!this.mqttClient || !this.mqttClient.connected) {
            console.error('Cannot subscribe: MQTT client is not connected');
            return;
        }
        this.mqttClient.subscribe(topic, (err) => {
            if (err) {
                console.error(`Failed to subscribe to topic ${topic}:`, err.message);
            } else {
                console.log(`Subscribed to topic ${topic}`);
            }
        });
    }
}

module.exports = MqttHandler;
