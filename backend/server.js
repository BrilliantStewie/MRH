import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import cron from "node-cron";
import bookingModel from "./models/bookingModel.js";

// Cloudinary
import connectCloudinary from "./config/cloudinary.js";

// Routes
import roomRouter from "./routes/roomRoute.js";
import userRouter from "./routes/userRoute.js";
import bookingRouter from "./routes/bookingRoute.js";
import adminRouter from "./routes/adminRoute.js";
import paymentRouter from "./routes/paymentRoute.js";
import packageRouter from "./routes/packageRoute.js"; // ✅ 1. IMPORT ADDED

const app = express();

// =======================
// ✅ MIDDLEWARE (ORDER MATTERS)
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true
  })
);

// Serve uploaded images
app.use("/uploads", express.static("uploads"));

// =======================
// ✅ ROUTES (FIXED)
// =======================

// ADMIN ROOM ROUTES
app.use("/api/admin", roomRouter);        

// OPTIONAL: Public room listing
app.use("/api/room", roomRouter);         

app.use("/api/user", userRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/payment", paymentRouter);

// ✅ 2. ROUTE ADDED (Fixes the 404 Error)
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
    } else {
      console.log("✅ CRON: No expired bookings found.");
    }
  } catch (error) {
    console.error("❌ CRON ERROR:", error.message);
  }
});

// =======================
// 🚀 SERVER START
// =======================
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL;

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB Connected");

    await connectCloudinary();
    console.log("✅ Cloudinary Connected");

    app.listen(PORT, () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  } catch (err) {
    console.error("❌ Server Start Failed:", err);
  }
};

startServer();