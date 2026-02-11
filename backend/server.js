import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cron from "node-cron";

// =======================
// 📦 MODELS
// =======================
import bookingModel from "./models/bookingModel.js";

// =======================
// ☁️ CLOUDINARY
// =======================
// ✅ FIXED: Use curly braces { } to import the named export
import { connectCloudinary } from "./config/cloudinary.js";

// =======================
// 🛣️ ROUTES
// =======================
import adminRouter from "./routes/adminRoute.js";
import staffRouter from "./routes/staffRoute.js";
import roomRouter from "./routes/roomRoute.js";
import userRouter from "./routes/userRoute.js";
import bookingRouter from "./routes/bookingRoute.js";
import paymentRouter from "./routes/paymentRoute.js";
import packageRouter from "./routes/packageRoute.js";

// =======================
// 🚀 APP INIT
// =======================
const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL;

// =======================
// ✅ GLOBAL MIDDLEWARE
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

app.use("/uploads", express.static("uploads"));

// =======================
// ✅ ROUTES
// =======================
app.use("/api/admin", adminRouter);
app.use("/api/staff", staffRouter);
app.use("/api/admin", roomRouter);
app.use("/api/room", roomRouter);
app.use("/api/user", userRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/package", packageRouter);

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
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB Connected");

    // This calls the function we imported above
    await connectCloudinary();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server Start Failed:", err);
  }
};

startServer();