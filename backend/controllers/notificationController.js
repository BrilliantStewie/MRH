// controllers/notificationController.js
import Notification from "../models/notificationModel.js";

/* ============================================================
   1️⃣ GET USER NOTIFICATIONS
============================================================ */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   2️⃣ MARK NOTIFICATION AS READ
============================================================ */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId }, // ✅ MUST MATCH MODEL
      { isRead: true },               // ✅ MUST MATCH MODEL
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or unauthorized",
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};