"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MqttHandler_1 = require("./MqttHandler");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const AMQP_URL = process.env.CLOUDAMQP_URL || '';
const QUEUE_NAME = 'test_queue';
const runMQTTHandler = () => __awaiter(void 0, void 0, void 0, function* () {
    const handler = new MqttHandler_1.MQTTHandler(AMQP_URL);
    yield handler.connect();
    // Publish a message
    yield handler.publish(QUEUE_NAME, 'Hello from MQTTHandler!');
    // Subscribe to the queue
    handler.subscribe(QUEUE_NAME, (message) => {
        console.log('Received message:', message);
    });
});
runMQTTHandler().catch((err) => {
    console.error('Error:', err);
});
