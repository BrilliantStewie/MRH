import express from "express";
import {
  addRoom,
  updateRoom,
  getAllRooms,
  changeAvailability,
  deleteRoom
} from "../controllers/roomController.js";

import upload from "../middlewares/multer.js";
// import authAdmin from "../middlewares/authAdmin.js"; // optional

const router = express.Router();

// ==================================
// 🟢 PUBLIC ROUTES
// ==================================
router.get("/list", getAllRooms);

// ==================================
// 🔴 ADMIN ROUTES
// ==================================

// 1️⃣ ADD ROOM
// ✅ multiple images
// ✅ key must be "images"
// ✅ limit to 6 images
router.post(
  "/add-room",
  upload.array("images", 6),
  addRoom
);

// 2️⃣ UPDATE ROOM
// ✅ room ID MUST be in URL params
// ✅ multiple images
router.post(
  "/update-room/:id",
  upload.array("images", 6),
  updateRoom
);

// 3️⃣ DELETE ROOM
router.post("/delete-room", deleteRoom);
router.delete("/delete/:id", deleteRoom);

// 4️⃣ TOGGLE AVAILABILITY
router.post("/toggle-room", changeAvailability);

export default router;
