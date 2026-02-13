import express from "express";
import {
  addRoom,
  updateRoom,
  getAllRooms,
  changeAvailability,
  deleteRoom
} from "../controllers/adminController.js"; // Pointing to your adminController as per previous code

import upload from "../middlewares/multer.js";
import authAdmin from "../middlewares/authAdmin.js"; 

const router = express.Router();

// 🟢 PUBLIC ROUTES
router.get("/list", getAllRooms);

// 🔴 ADMIN PROTECTED ROUTES
router.post("/add-room", authAdmin, upload.array("images", 6), addRoom);
router.post("/update-room/:id", authAdmin, upload.array("images", 6), updateRoom);
router.post("/delete-room", authAdmin, deleteRoom);
router.delete("/delete/:id", authAdmin, deleteRoom);
router.post("/toggle-room", authAdmin, changeAvailability);

export default router;