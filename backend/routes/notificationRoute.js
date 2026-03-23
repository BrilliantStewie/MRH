import express from "express";
import { getUserNotifications, markAsRead, deleteNotification, markAllAsRead, clearUserNotifications } from "../controllers/notificationController.js";
import authUser from "../middlewares/authUser.js";

const notificationRouter = express.Router();

// Fetch all notifications for the logged-in user
notificationRouter.get("/get", authUser, getUserNotifications);

// Mark a specific notification as read
notificationRouter.put("/read/:id", authUser, markAsRead);

// Mark all notifications as read
notificationRouter.put("/read-all", authUser, markAllAsRead);

// Clear all notifications for the logged-in user
notificationRouter.delete("/clear", authUser, clearUserNotifications);

// Delete a specific notification for the logged-in user
notificationRouter.delete("/:id", authUser, deleteNotification);

export default notificationRouter;
