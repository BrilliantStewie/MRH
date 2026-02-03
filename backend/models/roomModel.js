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
      enum: ["Individual", "Individual with pullout", "Dormitory"],
    },

    building: {
      type: String,
      required: true,
      enum: ["Margarita", "Nolasco"],
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

    // 🔥 MULTIPLE IMAGES (Gallery)
    images: {
      type: [String], // Cloudinary URLs
      default: [],
    },

    // ⭐ MAIN IMAGE (for cards/listing)
    cover_image: {
      type: String, // Cloudinary URL
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

const roomModel = mongoose.model("Room", roomSchema);
export default roomModel;
