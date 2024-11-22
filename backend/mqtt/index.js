const MqttHandler = require('./MqttHandler');

// HiveMQ Cloud Configuration
const host = 'wss://722cd62141ad4ac295d92751622de835.s1.eu.hivemq.cloud:8884/mqtt'; // TLS WebSocket URL
const username = 'toothbeacon1'; 
const password = 'Toothbeacon1';
const clientId = 'backend-client'; 

const mqttClient = new MqttHandler(host, username, password, clientId);

mqttClient.connect();

setTimeout(() => {
    mqttClient.subscribeTopic('tooth-beacon/authentication/register');
    mqttClient.sendMessage('tooth-beacon/authentication/register', 'Hello from the refactored MqttHandler!');
}, 2000);
