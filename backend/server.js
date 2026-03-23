import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
import express from "express";
import cors from "cors";
import cron from "node-cron";

// MODELS
import bookingModel from "./models/bookingModel.js";
import userModel from "./models/userModel.js";

// CONFIG
import { connectCloudinary } from "./config/cloudinary.js";
import connectDB from "./config/mongodb.js";

// ROUTES
import adminRouter from "./routes/adminRoute.js";
import staffRouter from "./routes/staffRoute.js";
import roomRouter from "./routes/roomRoute.js";
import userRouter from "./routes/userRoute.js";
import bookingRouter from "./routes/bookingRoute.js";
import paymentRouter from "./routes/paymentRoute.js";
import packageRouter from "./routes/packageRoute.js";
import reviewRouter from "./routes/reviewRoute.js";
import notificationRouter from "./routes/notificationRoute.js";

// =======================
// 🚀 APP INIT
// =======================
const app = express();
const PORT = process.env.PORT || 4000;
const parseAllowedOrigins = () => {
  const configuredOrigins = String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const fallbackOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
    "http://localhost:5173",
    "http://localhost:5174",
  ]
    .map((origin) => String(origin || "").trim())
    .filter(Boolean);

  return [...new Set(configuredOrigins.length ? configuredOrigins : fallbackOrigins)];
};
const allowedOrigins = parseAllowedOrigins();

// =======================
// ✅ GLOBAL MIDDLEWARE
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);

app.use("/uploads", express.static("uploads"));

// =======================
// ✅ ROUTES
// =======================
app.use("/api/admin", adminRouter);
app.use("/api/staff", staffRouter);
app.use("/api/room", roomRouter);
app.use("/api/user", userRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/package", packageRouter);
app.use("/api/reviews", reviewRouter); 
app.use("/api/notifications", notificationRouter); // ✅ Registered notification router

// =======================
// 🕒 CRON JOB
// =======================
cron.schedule("0 * * * *", async () => {
  console.log("⏳ CRON: Checking for expired pending bookings...");
  try {
    const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await bookingModel.updateMany(
      { status: "pending", createdAt: { $lt: timeLimit } },
      { $set: { status: "declined" } }
    );

    if (result.modifiedCount > 0) {
      console.log(`❌ CRON: Auto-declined ${result.modifiedCount} bookings.`);
    }
  } catch (error) {
    console.error("❌ CRON ERROR:", error.message);
  }
});

// =======================
// 🧠 SERVER START
// =======================
const startServer = async () => {
  try {
    await connectDB(); // ✅ Use centralized DB config

    await connectCloudinary();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server Start Failed:", err);
  }
};

startServer();
