import express from "express";
import dbConnect from "./utils/dbConnect";
import authRoutes from "./routes/auth";
import errorHandler from "./middlewares/errorHandler";
import cors from "cors";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: ["*"],
  })
);

// Connect to the database
dbConnect();

// Use authentication routes
app.use("/api/v1/auth", authRoutes);


// Error handler middleware
app.use(errorHandler);

export default app;
