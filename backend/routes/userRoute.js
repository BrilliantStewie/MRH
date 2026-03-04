import express from "express";
import {
  registerUser, 
  loginUser, 
  googleAuth, 
  sendOTP, 
  sendPhoneOTP,          // ✅ ADDED
  requestPasswordReset, 
  requestPhoneReset,     // ✅ ADDED
  resetPassword,         
  verifyOTP, 
  getUserData, 
  updateUserProfile,
  getUserBookings,
  createBooking, 
  cancelBooking,
  createCheckoutSession,
  verifyPayment,
  markCashPayment,
  rateBooking,
  addReviewChat, 
  deleteReviewReply,
  checkEmailExists,      // ✅ ADDED
  checkPhoneExists       // ✅ ADDED
} from "../controllers/userController.js";

import authUser from "../middlewares/authUser.js"; 
import upload from "../middlewares/multer.js";

const userRouter = express.Router();

// --- AUTH & PROFILE ---
userRouter.post("/register", upload.single('image'), registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/google-auth", googleAuth); 
userRouter.post("/send-otp", sendOTP); 
userRouter.post("/send-phone-otp", sendPhoneOTP);    // ✅ STEP 1: For Registration/Phone Login
userRouter.post("/verify-otp", verifyOTP); 

// ✅ New Check Routes
userRouter.post("/check-email", checkEmailExists);   // ✅ ADDED
userRouter.post("/check-phone", checkPhoneExists);   // ✅ ADDED

// ✅ Forgot Password Routes
userRouter.post("/request-reset", requestPasswordReset); 
userRouter.post("/request-phone-reset", requestPhoneReset); // ✅ STEP 1: For Phone Reset
userRouter.post("/reset-password", resetPassword); 

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
userRouter.post("/rate-booking", authUser, rateBooking);
userRouter.post("/add-review-chat", authUser, addReviewChat);
userRouter.post("/delete-review-reply", authUser, deleteReviewReply);

export default userRouter;