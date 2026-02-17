import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true },
  building: { type: String, default: "Nolasco" },
  includesFood: { type: Boolean, default: false },
  includesAC: { type: Boolean, default: false },
  amenities: { type: [String], default: [] }
}, { timestamps: true });

const Package =
  mongoose.models.Package ||
  mongoose.model("Package", packageSchema);

export default Package;