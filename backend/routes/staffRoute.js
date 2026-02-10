import express from "express";
import authStaff from "../middlewares/authStaff.js";
import { getStaffBookings } from "../controllers/staffController.js";

const router = express.Router();

/* =========================
   STAFF BOOKINGS (READ-ONLY)
========================= */
router.get("/bookings", authStaff, getStaffBookings);

export default router;
