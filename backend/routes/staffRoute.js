import express from "express";
import authStaff from "../middlewares/authStaff.js";
import upload from "../middlewares/multer.js";
import {
  staffLogin,
  getStaffProfile,
  updateStaffProfile,
  getStaffBookings,
  verifyStaffPhoneFirebase,
} from "../controllers/staffController.js";

// ✅ Import Admin controllers to reuse the logic for staff
import { getAllRooms, getAllUsers } from "../controllers/adminController.js"; 

// ✅ Import the chat controller
import { addReviewChat } from "../controllers/bookingController.js"; 
import { getAllPackages } from "../controllers/packageController.js";

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

router.post("/verify-phone-firebase", authStaff, verifyStaffPhoneFirebase);

/* =========================
   STAFF VIEW ALL GUEST BOOKINGS
========================= */
router.get("/bookings", authStaff, getStaffBookings);

/* =========================
   NEW: STAFF ACCESS TO ROOMS & USERS
   (Required for Staff Dashboard Sync)
========================= */
router.get("/rooms", authStaff, getAllRooms);
router.get("/users", authStaff, getAllUsers);
router.get("/packages", authStaff, getAllPackages);

/* =========================
   💬 STAFF REVIEW CHAT (Reply to Guest)
========================= */
router.post("/add-review-chat", authStaff, addReviewChat);

export default router;
