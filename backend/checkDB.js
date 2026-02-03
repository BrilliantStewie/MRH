import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "./models/userModel.js";
import roomModel from "./models/roomModel.js";
import bookingModel from "./models/bookingModel.js";

dotenv.config();

const checkData = async () => {
  try {
    console.log("🔌 Connecting to DB...");
    console.log(`URL: ${process.env.MONGODB_URI}`); // Verify this is the correct DB!

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected successfully!");

    const userCount = await userModel.countDocuments();
    const roomCount = await roomModel.countDocuments();
    const bookingCount = await bookingModel.countDocuments();

    console.log("\n--- DATABASE REPORT ---");
    console.log(`Users Found:    ${userCount}`);
    console.log(`Rooms Found:    ${roomCount}`);
    console.log(`Bookings Found: ${bookingCount}`);
    console.log("-----------------------\n");

    if (userCount === 0 && roomCount === 0) {
      console.log("⚠️  WARNING: Your database appears to be empty.");
      console.log("👉 Check if your .env MONGODB_URI is pointing to the correct database name.");
    } else {
      console.log("🎉 Data exists! The issue is likely in your adminRoute.js or Controller.");
    }

    process.exit();
  } catch (error) {
    console.error("❌ Connection Error:", error.message);
    process.exit(1);
  }
};

checkData();