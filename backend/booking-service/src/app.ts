import express from "express";
import dbConnect from "./utils/dbConnect";
import bookingRoutes from "./routes/booking";
import availabilityRoutes from "./routes/availability";
import errorHandler from "./middlewares/errorHandler";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config(); 

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
app.use("/api/v1/booking", bookingRoutes);
app.use("/api/v1/availability", availabilityRoutes);


// Error handler middleware
app.use(errorHandler);

export default app;
