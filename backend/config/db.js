import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('DB connected');
  } catch (error) {
    console.error('DB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;