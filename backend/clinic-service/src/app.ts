import express from "express";
import dbConnect from "./utils/dbConnect";
import clinicRoutes from "./routes/clinic";
import errorHandler from "./middlewares/errorHandler";
import cors from "cors";
import dotenv from "dotenv"; //needed?
dotenv.config(); //needed?

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: ["*"],
  })
);

// Connect to the database
dbConnect();

// Use clinic routes
app.use("/api/v1/clinic", clinicRoutes);


// Error handler middleware
app.use(errorHandler);

export default app;
