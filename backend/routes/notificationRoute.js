import express from "express";
import { getUserNotifications, markAsRead } from "../controllers/notificationController.js";
import authUser from "../middlewares/authUser.js";

const notificationRouter = express.Router();

// Fetch all notifications for the logged-in user
notificationRouter.get("/get", authUser, getUserNotifications);

// Mark a specific notification as read
notificationRouter.put("/read/:id", authUser, markAsRead);

export default notificationRouter;