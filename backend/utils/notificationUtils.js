import Notification from "../models/notificationModel.js";

const normalizeLink = (link) => String(link || "").trim();

const normalizeMessage = (message) => String(message || "").trim();

const buildNotificationKey = ({ recipient, type, message, link }) =>
  `${String(recipient)}::${type}::${normalizeMessage(message)}::${normalizeLink(link)}`;

export const buildNotificationMatchFilter = ({
  recipient,
  type,
  message,
  link,
}) => {
  const normalizedLink = normalizeLink(link);

  return {
    recipient,
    type,
    message: normalizeMessage(message),
    ...(normalizedLink
      ? { link: normalizedLink }
      : {
          $or: [{ link: "" }, { link: null }, { link: { $exists: false } }],
        }),
  };
};

const normalizeNotificationPayload = (notification) => {
  if (!notification?.recipient || !notification?.type || !notification?.message) {
    return null;
  }

  return {
    recipient: notification.recipient,
    sender: notification.sender || null,
    type: notification.type,
    message: normalizeMessage(notification.message),
    link: normalizeLink(notification.link),
    isRead: false,
    createdAt: new Date(),
  };
};

export const createOrRefreshNotifications = async (notifications = []) => {
  const uniqueNotifications = [];
  const seen = new Set();

  for (const notification of notifications) {
    const normalized = normalizeNotificationPayload(notification);
    if (!normalized) continue;

    const key = buildNotificationKey(normalized);
    if (seen.has(key)) continue;

    seen.add(key);
    uniqueNotifications.push(normalized);
  }

  if (!uniqueNotifications.length) return;

  await Notification.bulkWrite(
    uniqueNotifications.map((notification) => ({
      updateOne: {
        filter: {
          ...buildNotificationMatchFilter(notification),
          isRead: false,
        },
        update: {
          $set: {
            sender: notification.sender,
            type: notification.type,
            message: notification.message,
            link: notification.link,
            isRead: false,
            createdAt: notification.createdAt,
          },
          $setOnInsert: {
            recipient: notification.recipient,
          },
        },
        upsert: true,
      },
    }))
  );
};

export const createOrRefreshNotification = async (notification) => {
  await createOrRefreshNotifications([notification]);
};

export const dedupeNotificationsForDisplay = (notifications = [], limit = 20) => {
  const grouped = new Map();

  for (const notification of notifications) {
    const key = buildNotificationKey(notification);
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, notification);
      continue;
    }

    const currentIsUnread = !current.isRead;
    const nextIsUnread = !notification.isRead;

    if (!currentIsUnread && nextIsUnread) {
      grouped.set(key, notification);
      continue;
    }

    if (currentIsUnread === nextIsUnread) {
      const currentTime = new Date(current.createdAt || 0).getTime();
      const nextTime = new Date(notification.createdAt || 0).getTime();
      if (nextTime > currentTime) {
        grouped.set(key, notification);
      }
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, limit);
};
