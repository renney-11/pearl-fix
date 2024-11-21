import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

const dbConnect = async () => {
  try {
    console.log("Connecting to database...", MONGODB_URI);

    await mongoose.connect(MONGODB_URI);

    console.log("Database connected");
  } catch (error) {
    console.error("Database connection error:", error);

    process.exit(1);
  }
};

export default dbConnect;
