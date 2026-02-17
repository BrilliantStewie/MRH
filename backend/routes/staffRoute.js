import express from "express";
import authStaff from "../middlewares/authStaff.js";
import upload from "../middlewares/multer.js";
import {
  staffLogin,
  getStaffProfile,
  updateStaffProfile,
  getStaffBookings,
} from "../controllers/staffController.js";

// ✅ Import the chat controller
import { addReviewChat } from "../controllers/bookingController.js"; 

const router = express.Router();

/* =========================
   STAFF LOGIN
========================= */
router.post("/login", staffLogin);

/* =========================
   STAFF PROFILE
========================= */
router.get("/profile", authStaff, getStaffProfile);

/* =========================
   STAFF PROFILE UPDATE
========================= */
router.post(
  "/update-profile",
  authStaff,
  upload.single("image"),
  updateStaffProfile
);

/* =========================
   STAFF VIEW ALL GUEST BOOKINGS
========================= */
router.get("/bookings", authStaff, getStaffBookings);

/* =========================
   💬 STAFF REVIEW CHAT (Reply to Guest)
========================= */
router.post("/add-review-chat", authStaff, addReviewChat);

export default router;