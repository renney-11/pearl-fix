import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log('MongoDB URI:', MONGODB_URI);

const dbConnect = async () => {
  if (!MONGODB_URI) {
    console.error('MongoDB URI is missing!');
    return;
  }

  console.log('Connecting to database...', MONGODB_URI);

  try {
    // Updated connect method without deprecated options
    await mongoose.connect(MONGODB_URI);
    console.log('Database connected');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error; // Ensure app fails gracefully
  }
};

export default dbConnect;
