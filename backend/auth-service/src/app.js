"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dbConnect_1 = __importDefault(require("./utils/dbConnect"));
const auth_1 = __importDefault(require("./routes/auth"));
const errorHandler_1 = __importDefault(require("./middlewares/errorHandler"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv")); //needed?
dotenv_1.default.config(); //needed?
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: ["*"],
}));
// Connect to the database
(0, dbConnect_1.default)();
// Use authentication routes
app.use("/api/v1/auth", auth_1.default);
// Error handler middleware
app.use(errorHandler_1.default);
exports.default = app;
