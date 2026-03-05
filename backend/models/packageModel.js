import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
{
  name: { type: String, required: true, trim: true },

  roomType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RoomType",
    required: true
  },

  includesAC: { type: Boolean, default: false },
  includesFood: { type: Boolean, default: false },

  price: {
    type: Number,
    required: true,
    min: 0
  },

  description: { type: String, default: "" }

},
{ timestamps: true }
);

// prevent duplicate packages
packageSchema.index(
{ roomType: 1, includesAC: 1, includesFood: 1 },
{ unique: true }
);

const Package =
mongoose.models.Package ||
mongoose.model("Package", packageSchema);

export default Package;