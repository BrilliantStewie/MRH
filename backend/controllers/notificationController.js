// controllers/notificationController.js
import Notification from "../models/notificationModel.js";

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.userId; // Extracted from your auth middleware

    // 🔐 Only fetch notifications where the RECIPIENT is the logged-in user
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 }) // Newest first
      .limit(20);

    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Ensure user can only mark their OWN notification as read
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId }, 
      { isRead: true },
      { new: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};