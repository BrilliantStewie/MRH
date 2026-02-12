import express from "express";
import {
  registerUser, 
  loginUser, 
  googleAuth, 
  getUserData, 
  updateUserProfile,
  getUserBookings,
  createBooking, 
  cancelBooking,
  createCheckoutSession,
  verifyPayment,
  markCashPayment,
  rateBooking
} from "../controllers/userController.js";

import authUser from "../middlewares/authUser.js";
import upload from "../middlewares/multer.js";

const userRouter = express.Router();

// ------------------------------------------------
// 👤 AUTHENTICATION & PROFILE
// ------------------------------------------------

// Regular Email/Password Auth
userRouter.post("/register", upload.single('image'), registerUser);
userRouter.post("/login", loginUser);

// ✅ Google Authentication (New)
userRouter.post("/google-auth", googleAuth); 

// User Profile (Protected)
userRouter.get("/profile", authUser, getUserData);
userRouter.post("/update-profile", authUser, upload.single("image"), updateUserProfile);

// ------------------------------------------------
// 📅 BOOKING MANAGEMENT (Protected)
// ------------------------------------------------

// Get all bookings for the logged-in user
userRouter.get("/bookings", authUser, getUserBookings);

// Create a new booking
userRouter.post("/book", authUser, createBooking);

// Cancel a booking
userRouter.post("/cancel-booking", authUser, cancelBooking);

// ------------------------------------------------
// 💳 PAYMENT & CHECKOUT (Protected)
// ------------------------------------------------

// PayMongo Checkout Session
userRouter.post("/create-checkout-session", authUser, createCheckoutSession);

// Verify Online Payment
userRouter.post("/verify-payment", authUser, verifyPayment);

// Signal intent to pay Cash at property
userRouter.post("/mark-cash", authUser, markCashPayment);

// ------------------------------------------------
// ⭐ FEEDBACK (Protected)
// ------------------------------------------------
userRouter.post("/rate-booking", authUser, rateBooking);

export default userRouter;