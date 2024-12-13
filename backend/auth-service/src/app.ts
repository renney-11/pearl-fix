import express from "express";
import dbConnect from "./utils/dbConnect";
import authRoutes from "./routes/auth";
import errorHandler from "./middlewares/errorHandler";
import cors from "cors";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// Enable JSON body parsing
app.use(express.json());

// Add CORS middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);


// Connect to the database
dbConnect();

// Use authentication routes
app.use("/api/v1/auth", authRoutes);

// Error handler middleware
app.use(errorHandler);

export default app;
