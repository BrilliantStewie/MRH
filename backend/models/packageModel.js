import mongoose from "mongoose";

const packageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    building: { type: String, default: "Nolasco" },
    includesFood: { type: Boolean, default: false },
    includesAC: { type: Boolean, default: false },
}, { timestamps: true });

const packageModel = mongoose.models.package || mongoose.model("package", packageSchema);

export default packageModel;