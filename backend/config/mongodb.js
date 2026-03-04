// backend/config/mongodb.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI is not set in .env");
    }

    // Connect to MongoDB
    await mongoose.connect(uri);

    // When connected
    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB Connected");
      console.log("📂 Connected to Database:", mongoose.connection.name);
    });

    // If error occurs
    mongoose.connection.on("error", (err) => {
      console.log("❌ MongoDB error:", err);
    });

  } catch (err) {
    console.log("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
};

export default connectDB;