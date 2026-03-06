import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true
  },

  // flexible type (room, day, event, etc.)
  packageType: {
    type: String,
    required: true,
    trim: true
  },

  // optional because day retreat packages don't belong to rooms
  roomType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoomType",
    default: null
  },

  // amenities stored as strings
  amenities: [
    {
      type: String,
      trim: true
    }
  ],

  price: {
    type: Number,
    required: true,
    min: 0
  },

  description: {
    type: String,
    default: ""
  }

},
{ timestamps: true }
);

const Package =
mongoose.models.Package ||
mongoose.model("Package", packageSchema);

export default Package;