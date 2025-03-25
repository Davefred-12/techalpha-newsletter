import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import "dotenv/config.js";
import { mkdirSync } from "fs";
import { connectDB } from "./config/db.js";
import cors from "cors";
import subscriberRoutes from "./routes/subscriberRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";

// Enhanced error logging
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason, 'at:', promise);
  process.exit(1);
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 9000;



// Improved CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://techalpha-newsletter-front.onrender.com', 
      'http://localhost:3000'
    ];
    
    console.log('Incoming Origin:', origin);
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};

 connectDB();

    // Apply middleware
    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));

    app.use(express.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use(
      session({
        secret: process.env.SESSION_SECRET || "your-generated-secret",
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false },
      })
    );

    // Create uploads directory
    const uploadsDir = process.env.NODE_ENV === 'production' 
      ? '/tmp/uploads'  
      : './uploads';

    try {
      mkdirSync(uploadsDir, { recursive: true });
    } catch (err) {
      console.error("Upload directory error:", err);
    }

    // Routes
    app.use("/api", subscriberRoutes);
    app.use("/api", adminRoutes);
    app.use("/api", newsletterRoutes);

    app.get("/", (req, res) => {
      res.send("API is running...");
    });

    // Global error handler
    app.use((err, req, res, next) => {
      console.error('Unhandled Error:', err);
      res.status(500).json({
        message: 'An unexpected error occurred',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
      });
    });

    // Start server
    const server = app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

