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
  rateBooking,
  addReviewChat, // Moved this here from userController
  deleteReviewReply // Added this import
} from "../controllers/userController.js";

import authUser from "../middlewares/authUser.js"; // Fixed path (usually middleware, not middlewares)
import upload from "../middlewares/multer.js";

const userRouter = express.Router();

// --- AUTH & PROFILE ---
userRouter.post("/register", upload.single('image'), registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/google-auth", googleAuth); 
userRouter.get("/profile", authUser, getUserData);
userRouter.post("/update-profile", authUser, upload.single("image"), updateUserProfile);

// --- BOOKINGS ---
userRouter.get("/bookings", authUser, getUserBookings);
userRouter.post("/book", authUser, createBooking);
userRouter.post("/cancel-booking", authUser, cancelBooking);

// --- PAYMENTS ---
userRouter.post("/create-checkout-session", authUser, createCheckoutSession);
userRouter.post("/verify-payment", authUser, verifyPayment);
userRouter.post("/mark-cash", authUser, markCashPayment);

// --- FEEDBACK & PRIVATE CHAT ---
// Note: getAllPublicReviews is REMOVED from here. Use reviewRoute instead.
userRouter.post("/rate-booking", authUser, rateBooking);
userRouter.post("/add-review-chat", authUser, addReviewChat);
userRouter.post("/delete-review-reply", authUser, deleteReviewReply);

export default userRouter;