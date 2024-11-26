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
exports.getCurrentUser = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jose_1 = require("jose");
const User_1 = __importDefault(require("../models/User"));
const MqttHandler_1 = require("../../../mqtt/MqttHandler");
const mqttHandler = new MqttHandler_1.MQTTHandler(process.env.CLOUDAMQP_URL);
mqttHandler.connect(); // Ensure RabbitMQ connection is established
// Register User
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, role } = req.body;
    try {
        let user;
        user = yield User_1.default.findOne({ email });
        if (user) {
            const errorMessage = { message: "User already exists" };
            res.status(400).json(errorMessage);
            yield mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(errorMessage)); // Convert object to string
            return;
        }
        user = new User_1.default({ name, email, password, role });
        const salt = yield bcryptjs_1.default.genSalt(10);
        user.password = yield bcryptjs_1.default.hash(password, salt);
        yield user.save();
        const payload = { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
        const secretKey = jose_1.base64url.decode(process.env.JWT_SECRET);
        if (secretKey.length !== 32) {
            throw new Error('Invalid JWT_SECRET length. It must be 32 bytes for A256GCM.');
        }
        const token = yield new jose_1.EncryptJWT(payload)
            .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
            .setExpirationTime("1h")
            .encrypt(secretKey);
        res.json({ token });
        yield mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ token })); // Convert object to string
    }
    catch (error) {
        console.error(error);
        const errorMessage = { message: "Server error" };
        res.status(500).json(errorMessage);
        yield mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(errorMessage)); // Convert object to string
    }
});
exports.register = register;
// Login User
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        let user;
        user = yield User_1.default.findOne({ email });
        if (!user) {
            const errorMessage = { message: "Invalid credentials" };
            res.status(400).json(errorMessage);
            yield mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(errorMessage)); // Convert object to string
            return;
        }
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            const errorMessage = { message: "Invalid credentials" };
            res.status(400).json(errorMessage);
            yield mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(errorMessage)); // Convert object to string
            return;
        }
        const payload = { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
        const secretKey = jose_1.base64url.decode(process.env.JWT_SECRET);
        if (secretKey.length !== 32) {
            throw new Error('Invalid JWT_SECRET length. It must be 32 bytes for A256GCM.');
        }
        const token = yield new jose_1.EncryptJWT(payload)
            .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
            .setExpirationTime("1h")
            .encrypt(secretKey);
        res.json({ token });
        yield mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify({ token })); // Convert object to string
    }
    catch (error) {
        console.error(error);
        const errorMessage = { message: "Server error" };
        res.status(500).json(errorMessage);
        yield mqttHandler.publish("tooth-beacon/authentication/authenticate", JSON.stringify(errorMessage)); // Convert object to string
    }
});
exports.login = login;
// Get Current User
const getCurrentUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(400).json({ message: "User not authenticated" });
            return;
        }
        const user = yield User_1.default.findById(req.user.id).select(["-password", "-id"]); // Exclude sensitive fields
        res.json(user);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getCurrentUser = getCurrentUser;
