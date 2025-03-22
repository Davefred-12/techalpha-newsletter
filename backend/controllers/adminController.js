import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const adminSignup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin already exists with this email." });
    }

    // Validate inputs
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await Admin.create({
      name: name,
      username: email, 
      password: hashedPassword 
    });

    res.status(201).json({ message: "Admin created successfully." });
  } catch (error) {
    console.error("Signup Error:", error); // Add logging for debugging
    res.status(500).json({
      message: "Error signing up. Please try again.",
      error: error.message, // Include in development only
    });
  }
};

export const adminLogin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (admin && (await bcrypt.compare(password, admin.password))) {
      const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
      res.cookie('auth_token', token, { httpOnly: true });
      res.status(200).json({ 
        message: 'Login successful!', 
        token,
        name: admin.name  // Include the admin's name in the response
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials.' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Login error' });
  }
};
