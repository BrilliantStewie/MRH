import express from "express";
import {
  registerUser,
  loginUser,
  googleAuth,
  sendOTP,
  sendEmailChangeOTP,
  sendPhoneOTP,
  sendPhoneOTPUpdate,
  verifyPhoneFirebase,
  requestPasswordReset,
  requestPhoneReset,
  resetPassword,
  verifyOTP,
  verifyPhoneOTP,
  verifyEmailChangeOTP,
  verifyPhoneOTPUpdate,
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
  checkEmailExists,
  checkPhoneExists,
  checkEmailExistsForUpdate,
  checkPhoneExistsForUpdate
} from "../controllers/userController.js";

import authUser from "../middlewares/authUser.js";
import upload from "../middlewares/multer.js";

const userRouter = express.Router();

// --- AUTH & PROFILE ---
userRouter.post("/register", upload.single("image"), registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/google-auth", googleAuth);
userRouter.post("/send-otp", sendOTP);
userRouter.post("/send-email-change-otp", authUser, sendEmailChangeOTP);
userRouter.post("/send-phone-otp", sendPhoneOTP);
userRouter.post("/send-phone-otp-update", authUser, sendPhoneOTPUpdate);
userRouter.post("/verify-otp", verifyOTP);
userRouter.post("/verify-phone-otp", verifyPhoneOTP);
userRouter.post("/verify-email-change-otp", authUser, verifyEmailChangeOTP);
userRouter.post("/verify-phone-otp-update", authUser, verifyPhoneOTPUpdate);
userRouter.post("/verify-phone-firebase", authUser, verifyPhoneFirebase);

userRouter.post("/check-email", checkEmailExists);
userRouter.post("/check-phone", checkPhoneExists);
userRouter.post("/check-email-update", authUser, checkEmailExistsForUpdate);
userRouter.post("/check-phone-update", authUser, checkPhoneExistsForUpdate);

userRouter.post("/request-reset", requestPasswordReset);
userRouter.post("/request-phone-reset", requestPhoneReset);
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
