import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Ensure both functions are correctly exported
export const adminSignup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: "All fields are required." 
      });
    }

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

    // Save admin
    await newAdmin.save();

    res.status(201).json({ 
      message: "Admin created successfully.",
      data: { name, email } 
    });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({
      message: "Error signing up. Please try again.",
      error: error.message
    });
  }
};

export const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // Find admin by username
    const admin = await Admin.findOne({ username });
    
    // Check if admin exists
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Create token
    const token = jwt.sign(
      { id: admin._id, role: 'admin' }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // Send response
    res.status(200).json({ 
      message: 'Login successful!', 
      token,
      name: admin.name 
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ 
      message: 'Login error',
      error: error.message 
    });
  }
};