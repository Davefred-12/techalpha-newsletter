import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from "dotenv";
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

connectDB();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
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
import { mkdirSync } from "fs";
try {
  mkdirSync("./uploads");
} catch (err) {
  if (err.code !== "EEXIST") throw err;
}

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../frontend/build")));

// API routes
app.use("/api", subscriberRoutes);
app.use("/api", adminRoutes);
app.use("/api", newsletterRoutes);


// Handle React routing, return all requests to React app
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
