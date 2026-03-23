import Notification from "../models/notificationModel.js";
import {
  buildNotificationMatchFilter,
  dedupeNotificationsForDisplay,
} from "../utils/notificationUtils.js";

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.userId;

    const notifications = await Notification.find({
      recipient: userId,
      type: { $ne: "account_status" },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      success: true,
      notifications: dedupeNotificationsForDisplay(notifications, 20),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const notification = await Notification.findOne({
      _id: id,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or unauthorized",
      });
    }

    await Notification.updateMany(
      {
        recipient: userId,
        ...buildNotificationMatchFilter(notification),
      },
      { isRead: true }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const notification = await Notification.findOne({
      _id: id,
      recipient: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or unauthorized",
      });
    }

    const result = await Notification.deleteMany({
      recipient: userId,
      ...buildNotificationMatchFilter(notification),
    });

    res.json({ success: true, deleted: result.deletedCount || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, updated: result.modifiedCount || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const clearUserNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const result = await Notification.deleteMany({ recipient: userId });
    res.json({ success: true, deleted: result.deletedCount || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
