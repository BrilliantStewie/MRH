import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: "", // Added default
    },
    image: {  // ✅ Renamed from 'image_url' to 'image' to match Frontend
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["admin", "staff", "user"],
      default: "user",
    },
    // Gender, DOB, Address are NOT here, keeping DB clean.
  },
  { timestamps: true }
);

const userModel = mongoose.models.User || mongoose.model("User", userSchema);

export default userModel;