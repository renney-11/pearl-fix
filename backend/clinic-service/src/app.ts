import express from "express";
import dbConnect from "./utils/dbConnect";
import clinicRoutes from "./routes/clinic";
import errorHandler from "./middlewares/errorHandler";
import cors from "cors";
import dotenv from "dotenv"; //needed?
dotenv.config(); //needed?

const app = express();

app.use(express.json());

// Add CORS middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);

app.options("*", cors()); // Respond to all OPTIONS requests

// Connect to the database
dbConnect();

// Use clinic routes
app.use("/api/v1/clinic", clinicRoutes);


// Error handler middleware
app.use(errorHandler);

export default app;
