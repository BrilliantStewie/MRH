import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });
import express from "express";
import cors from "cors";
import cron from "node-cron";
import http from "http";

// MODELS
import bookingModel from "./models/bookingModel.js";

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
import reportRouter from "./routes/reportRoute.js";
import { createCorsOriginHandler, resolveCorsConfig } from "./utils/corsConfig.js";
import { dispatchRealtimeMutation } from "./utils/realtimeDispatch.js";
import {
  emitRealtimeUpdate,
  initRealtimeServer,
} from "./utils/realtimeServer.js";

// =======================
// 🚀 APP INIT
// =======================
const app = express();
const PORT = process.env.PORT || 4000;
const httpServer = http.createServer(app);
const corsConfig = resolveCorsConfig();

// =======================
// ✅ GLOBAL MIDDLEWARE
// =======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: createCorsOriginHandler(corsConfig, "CORS"),
    credentials: true,
  })
);

app.use("/uploads", express.static("uploads"));

app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (body?.success && res.statusCode < 400) {
      queueMicrotask(() => {
        dispatchRealtimeMutation(req).catch((error) => {
          console.error("Realtime dispatch error:", error.message);
        });
      });
    }

    return originalJson(body);
  };

  next();
});

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
app.use("/api", reportRouter);

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
      emitRealtimeUpdate({
        rooms: ["public", "admin", "staff"],
        payload: {
          entity: "bookings",
          action: "cron-auto-decline",
          path: "cron:auto-decline",
        },
      });
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
    initRealtimeServer(httpServer, { corsConfig });

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server Start Failed:", err);
  }
};

startServer();
