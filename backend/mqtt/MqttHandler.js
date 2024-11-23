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
exports.MQTTHandler = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
class MQTTHandler {
    constructor(amqpUrl) {
        this.amqpUrl = amqpUrl;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            this.connection = yield amqplib_1.default.connect(this.amqpUrl);
            this.channel = yield this.connection.createChannel();
            console.log('Connected to RabbitMQ');
        });
    }
    publish(queue, message) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.channel.assertQueue(queue, { durable: true });
            this.channel.sendToQueue(queue, Buffer.from(message));
            console.log(`Published message to "${queue}": ${message}`);
        });
    }
    subscribe(queue, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.channel.assertQueue(queue, { durable: true });
            console.log(`Subscribed to queue "${queue}"`);
            this.channel.consume(queue, (msg) => {
                if (msg) {
                    const content = msg.content.toString();
                    callback(content);
                    this.channel.ack(msg);
                }
            });
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.channel.close();
            yield this.connection.close();
            console.log('Closed RabbitMQ connection');
        });
    }
}
exports.MQTTHandler = MQTTHandler;
