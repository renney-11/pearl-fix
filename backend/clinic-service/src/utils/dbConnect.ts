import dotenv from 'dotenv';  // Ensure dotenv is imported
dotenv.config();  // Load the .env file

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

console.log('MongoDB URI:', MONGODB_URI);  // Should print the actual URI if loaded correctly

const dbConnect = async () => {
  try {
    if (!MONGODB_URI) {
      console.error('MongoDB URI is missing!');
      return;
    }

    console.log('Connecting to database...', MONGODB_URI);

    await mongoose.connect(MONGODB_URI);

    console.log('Database connected');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

export default dbConnect;
