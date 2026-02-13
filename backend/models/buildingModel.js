import mongoose from "mongoose";

const buildingSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

const buildingModel = mongoose.models.Building || mongoose.model("Building", buildingSchema);

export default buildingModel;