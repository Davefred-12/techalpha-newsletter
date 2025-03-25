import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from 'mongoose';

export const adminSignup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: "All fields are required." 
      });
    }

    // Log connection state before operation
    console.log('Mongoose Connection State:', {
      readyState: mongoose.connection.readyState,
      connectionString: mongoose.connection.client?.s?.url
    });

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ 
        message: "Database connection is not ready. Please try again later.",
        connectionState: mongoose.connection.readyState
      });
    }

    // More detailed logging
    console.log('Attempting to find existing admin:', email);

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ username: email });
    if (existingAdmin) {
      return res.status(400).json({ 
        message: "Admin already exists with this email." 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin
    const newAdmin = new Admin({
      name,
      username: email,
      password: hashedPassword
    });

    // Save with extended timeout and logging
    console.log('Saving new admin:', { name, email });
    await newAdmin.save({ 
      timeout: 20000 // 20 seconds timeout 
    });

    res.status(201).json({ 
      message: "Admin created successfully.",
      data: { name, email } 
    });

  } catch (error) {
    // Comprehensive error logging
    console.error("Signup Error Details:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      mongooseError: error instanceof mongoose.Error,
      connectionState: mongoose.connection.readyState
    });

    // Specific error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: "Validation Error",
        details: Object.values(error.errors).map(err => err.message)
      });
    }

    // Generic error response
    res.status(500).json({
      message: "Error signing up. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal Server Error'
    });
  }
};