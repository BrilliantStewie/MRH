import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    room_type: {
      type: String,
      required: true,
      trim: true,
      // Ensures "dormitory" becomes "Dormitory" for a clean UI
      set: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v
    },
    building: {
      type: String,
      required: true,
      trim: true,
      // Ensures consistency across your building names
      set: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    description: {
      type: String,
      required: true,
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    cover_image: {
      type: String,
      default: "",
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// This ensures the model works in Next.js/Hot-reload environments
const roomModel = mongoose.models.Room || mongoose.model("Room", roomSchema);

export default roomModel;