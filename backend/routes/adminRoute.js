import express from "express";
import {
  loginAdmin,
  verifyAdminSession,
  adminDashboard,
  getAllUsers,
  addGuestUser,
  changeUserStatus,
  createStaff,
  updateStaff,
  addRoom,
  updateRoom,
  getAllRooms,
  changeAvailability,
  deleteRoom,
  allBookings,
  approveBooking,
  declineBooking,
  resolveCancellation,
  paymentConfirmed,
  approveCancellationRequest,
  checkExpiredCancellations,
  getBuildings,
  addBuilding,
  deleteBuilding,
  updateBuilding,
  getRoomTypes,
  addRoomType,
  deleteRoomType,
  updateRoomType
} from "../controllers/adminController.js";

import {
  addPackage,
  getAllPackages,
  updatePackage,
  deletePackage
} from "../controllers/packageController.js";
import { updateBookingStayStatus } from "../controllers/bookingStayController.js";

// ✅ Import the chat controller from your booking controller file
import { addReviewChat } from "../controllers/bookingController.js"; 

import authAdmin from "../middlewares/authAdmin.js";
import upload from "../middlewares/multer.js";

const adminRouter = express.Router();

// 🔐 AUTH & DASHBOARD
adminRouter.post("/login", loginAdmin);
adminRouter.get("/session", authAdmin, verifyAdminSession);
adminRouter.get("/dashboard", authAdmin, adminDashboard);

// 👥 USERS & STAFF
adminRouter.get("/users", authAdmin, getAllUsers);
adminRouter.post("/add-guest", authAdmin, addGuestUser);
adminRouter.post("/create-staff", authAdmin, upload.single("image"), createStaff);
adminRouter.post("/update-staff", authAdmin, upload.single("image"), updateStaff);
adminRouter.post("/change-user-status", authAdmin, changeUserStatus);

// 🛏️ ROOMS
adminRouter.post("/add-room", authAdmin, upload.array("images", 6), addRoom);
adminRouter.post("/update-room", authAdmin, upload.array("images", 6), updateRoom);
adminRouter.get("/all-rooms", authAdmin, getAllRooms);
adminRouter.post("/change-availability", authAdmin, changeAvailability);
adminRouter.post("/delete-room", authAdmin, deleteRoom);

// ⚙️ SETTINGS
adminRouter.get("/buildings", authAdmin, getBuildings);
adminRouter.post("/add-building", authAdmin, addBuilding);
adminRouter.post("/delete-building", authAdmin, deleteBuilding);
adminRouter.post("/update-building", authAdmin, updateBuilding);
adminRouter.get("/room-types", authAdmin, getRoomTypes);
adminRouter.post("/add-room-type", authAdmin, addRoomType);
adminRouter.post("/delete-room-type", authAdmin, deleteRoomType);
adminRouter.post("/update-room-type", authAdmin, updateRoomType);

// 📅 BOOKINGS & CANCELLATIONS
adminRouter.get("/all-bookings", authAdmin, allBookings);
adminRouter.put("/bookings/:bookingId/approve", authAdmin, approveBooking);
adminRouter.put("/bookings/:bookingId/decline", authAdmin, declineBooking);
adminRouter.put("/bookings/:bookingId/stay-status", authAdmin, updateBookingStayStatus);
adminRouter.post("/confirm-payment", authAdmin, paymentConfirmed);
adminRouter.post("/approve-cancellation", authAdmin, approveCancellationRequest);
adminRouter.post("/check-expired-cancellations", authAdmin, checkExpiredCancellations);
adminRouter.post("/resolve-cancellation", authAdmin, resolveCancellation);

// 💬 REVIEW CHAT (New Route for Admin/Staff replies)
adminRouter.post("/add-review-chat", authAdmin, addReviewChat);

// 📦 PACKAGES
adminRouter.get("/packages", authAdmin, getAllPackages);
adminRouter.post("/add-package", authAdmin, upload.single("image"), addPackage);

// ✅ CHANGE 1: Added /:id so the backend can find which package to update
adminRouter.post("/update-package/:id", authAdmin, upload.single("image"), updatePackage);

// ✅ CHANGE 2: Added /:id so the backend knows which package to delete
adminRouter.post("/delete-package/:id", authAdmin, deletePackage);

export default adminRouter;
