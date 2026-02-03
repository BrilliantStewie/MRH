import express from "express";
import {
  registerUser, 
  loginUser, 
  getUserData, 
  updateUserProfile
} from "../controllers/userController.js";

// ✅ Import Booking functions from the correct controller
import { 
  userBookings,          // Was getUserBookings
  createBooking, 
  cancelBooking,
  createCheckoutSession,
  verifyPayment,
  markCash,              // Was markCashPayment
  rateBooking
} from "../controllers/bookingController.js";

import authUser from "../middlewares/authUser.js";
import upload from "../middlewares/multer.js";

const userRouter = express.Router();

// ------------------------------------------------
// 👤 AUTH & PROFILE
// ------------------------------------------------
userRouter.post("/register", upload.single('image'), registerUser);
userRouter.post("/login", loginUser);
userRouter.get("/profile", authUser, getUserData);
userRouter.post("/update-profile", authUser, upload.single("image"), updateUserProfile);

// ------------------------------------------------
// 📅 BOOKING MANAGEMENT
// ------------------------------------------------

// Get all bookings for the logged-in user
userRouter.get("/bookings", authUser, userBookings);

// Create a new booking
userRouter.post("/book", authUser, createBooking);

// Cancel (or request cancellation of) a booking
userRouter.post("/cancel-booking", authUser, cancelBooking);

// ------------------------------------------------
// 💳 PAYMENT
// ------------------------------------------------

// Initialize Stripe/Online Payment
userRouter.post("/create-checkout-session", authUser, createCheckoutSession);

// Verify Online Payment success
userRouter.post("/verify-payment", authUser, verifyPayment);

// User signals they want to pay Cash at Hotel
userRouter.post("/mark-cash", authUser, markCash);

// 🛑 REMOVED: userRouter.post("/confirm-cash") 
// Reason: Only Admins can confirm that cash was received. 
// Users use "/mark-cash" to say "I will pay cash".

// ------------------------------------------------
// ⭐ RATINGS
// ------------------------------------------------
userRouter.post("/rate-booking", authUser, rateBooking);

export default userRouter;