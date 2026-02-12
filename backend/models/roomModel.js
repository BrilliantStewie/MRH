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
      enum: ["Individual", "Individual with Pullout", "Dormitory"],
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

const roomModel = mongoose.models.Room || mongoose.model("Room", roomSchema);

export default roomModel;