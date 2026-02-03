import express from "express";
import {
  addPackage,
  getAllPackages,
  updatePackage,
  deletePackage,
} from "../controllers/packageController.js";

import authAdmin from "../middlewares/authAdmin.js";

const packageRouter = express.Router();

// ✅ PUBLIC ROUTE (For Retreat Booking Page)
// This matches the frontend call: /api/package/list
packageRouter.get("/list", getAllPackages); 

// 📦 ADMIN ONLY ROUTES
packageRouter.post("/", authAdmin, addPackage);
packageRouter.get("/", authAdmin, getAllPackages); // For Admin Panel
packageRouter.put("/:id", authAdmin, updatePackage);
packageRouter.delete("/:id", authAdmin, deletePackage);

export default packageRouter;