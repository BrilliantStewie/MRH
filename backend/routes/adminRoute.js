import express from "express";
import {
  loginAdmin,
  adminDashboard,
  getAllUsers,
  changeUserStatus, // ✅ Added this
  createStaff,
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
  checkExpiredCancellations
} from "../controllers/adminController.js";

import {
  addPackage,
  getAllPackages,
  updatePackage,
  deletePackage
} from "../controllers/packageController.js";

import authAdmin from "../middlewares/authAdmin.js";
import upload from "../middlewares/multer.js";

const adminRouter = express.Router();

// 🔐 AUTH
adminRouter.post("/login", loginAdmin);

// 📊 DASHBOARD
adminRouter.get("/dashboard", authAdmin, adminDashboard);

// 👥 USERS
adminRouter.get("/users", authAdmin, getAllUsers);
adminRouter.post("/create-staff", authAdmin, upload.single("image"), createStaff);
adminRouter.post("/change-user-status", authAdmin, changeUserStatus); // ✅ Added this route

// 🛏️ ROOMS
adminRouter.post("/add-room", authAdmin, upload.array("image"), addRoom);
adminRouter.post("/update-room", authAdmin, upload.array("image"), updateRoom);

adminRouter.get("/all-rooms", authAdmin, getAllRooms);
adminRouter.post("/change-availability", authAdmin, changeAvailability);
adminRouter.post("/delete-room", authAdmin, deleteRoom);

// 📅 BOOKINGS
adminRouter.get("/bookings", authAdmin, allBookings);
adminRouter.put("/bookings/:bookingId/approve", authAdmin, approveBooking);
adminRouter.put("/bookings/:bookingId/decline", authAdmin, declineBooking);
adminRouter.post("/confirm-payment", authAdmin, paymentConfirmed);

// 🛑 CANCELLATIONS
adminRouter.post("/approve-cancellation", authAdmin, approveCancellationRequest);
adminRouter.post("/check-expired-cancellations", authAdmin, checkExpiredCancellations);
adminRouter.post("/resolve-cancellation", authAdmin, resolveCancellation);

// 📦 PACKAGES
adminRouter.get("/packages", authAdmin, getAllPackages);
adminRouter.post("/packages", authAdmin, addPackage); 
adminRouter.put("/packages/:id", authAdmin, updatePackage);
adminRouter.delete("/packages/:id", authAdmin, deletePackage);

export default adminRouter;