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
      default: "", 
    },
    image: { 
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["admin", "staff", "user"],
      default: "user",
    },
    // 👇 ADD THIS LINE HERE
    disabled: {
      type: Boolean,
      default: false, // Accounts are active by default
    },
  },
  { timestamps: true }
);

const userModel = mongoose.models.User || mongoose.model("User", userSchema);

export default userModel;