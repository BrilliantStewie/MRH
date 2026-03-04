import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  building: { type: String, default: "Nolasco" },
  description: { type: String, default: "" },
  includesFood: { type: Boolean, default: false },
  includesAC: { type: Boolean, default: false },
  amenities: { type: [String], default: [] }
}, { timestamps: true });

const Package = mongoose.models.Package || mongoose.model("Package", packageSchema);

export default Package;