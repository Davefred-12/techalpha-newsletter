import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from "dotenv";
import { mkdirSync } from "fs";
import connectDB from "./config/db.js";
import cors from "cors";
import subscriberRoutes from "./routes/subscriberRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 9000;

// Connect to database
connectDB();

// CORS configuration - more permissive for troubleshooting
app.use(cors({
  origin: '*',  // Allow all origins temporarily for debugging
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Enable pre-flight requests for all routes
app.options('*', cors());

// Other middleware
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

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.NODE_ENV === 'production' 
  ? '/tmp/uploads'  // Use Render's temporary storage
  : './uploads';

try {
  mkdirSync(uploadsDir, { recursive: true });
} catch (err) {
  if (err.code !== "EEXIST") console.error("Upload directory error:", err);
}

// Test endpoint for CORS
app.get('/api/test-cors', (req, res) => {
  res.json({ message: 'CORS is working!' });
});

// API routes
app.use("/api", subscriberRoutes);
app.use("/api", adminRoutes);
app.use("/api", newsletterRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});