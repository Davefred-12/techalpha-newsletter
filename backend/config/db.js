import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    // Parse the MongoDB URI to extract connection details
    const uri = process.env.MONGODB_URI;
    
    // Detailed connection options
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Increase server selection timeout
      socketTimeoutMS: 45000, // Increase socket timeout
      connectTimeoutMS: 30000, // Increase connection timeout
      maxPoolSize: 10, // Limit connection pool size
      minPoolSize: 5, // Minimum pool size
    };

    // Log connection attempt
    console.log('Attempting to connect to MongoDB with URI:', 
      uri.replace(/:[^:]*@/, ':****@') // Mask password in log
    );

    // Establish connection
    await mongoose.connect(uri, connectionOptions);

    // Log successful connection
    console.log('MongoDB Connection Details:', {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    });

    // Add connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to database');
    });

    mongoose.connection.on('error', (err) => {
      console.error('Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('Mongoose disconnected from database');
    });

  } catch (error) {
    // Comprehensive error logging
    console.error('MongoDB Connection Fatal Error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });

    // Exit process on connection failure
    process.exit(1);
  }
};

export default connectDB;