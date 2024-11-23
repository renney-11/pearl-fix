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
const dotenv_1 = __importDefault(require("dotenv")); // Ensure dotenv is imported
dotenv_1.default.config(); // Load the .env file
const mongoose_1 = __importDefault(require("mongoose"));
const MONGODB_URI = process.env.MONGODB_URI;
console.log('MongoDB URI:', MONGODB_URI); // Should print the actual URI if loaded correctly
const dbConnect = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!MONGODB_URI) {
            console.error('MongoDB URI is missing!');
            return;
        }
        console.log('Connecting to database...', MONGODB_URI);
        yield mongoose_1.default.connect(MONGODB_URI);
        console.log('Database connected');
    }
    catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
});
exports.default = dbConnect;
