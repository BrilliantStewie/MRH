import mongoose from "mongoose";

const roomTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

const roomTypeModel = mongoose.models.RoomType || mongoose.model("RoomType", roomTypeSchema);

export default roomTypeModel;