import { emitRealtimeUpdate } from "./realtimeServer.js";

const normalizePath = (value = "") => String(value).split("?")[0];

const isMatch = (path, matchers = []) =>
  matchers.some((matcher) =>
    matcher instanceof RegExp ? matcher.test(path) : matcher === path
  );

const bookingMatchers = [
  "/api/user/book",
  "/api/user/cancel-booking",
  "/api/user/verify-payment",
  "/api/user/mark-cash",
  "/api/booking/create",
  "/api/booking/cancel-booking",
  "/api/booking/verify-payment",
  "/api/booking/mark-cash",
  "/api/admin/confirm-payment",
  "/api/admin/approve-cancellation",
  "/api/admin/resolve-cancellation",
  "/api/admin/check-expired-cancellations",
  /^\/api\/admin\/bookings\/[^/]+\/approve$/,
  /^\/api\/admin\/bookings\/[^/]+\/decline$/,
  /^\/api\/admin\/bookings\/[^/]+\/stay-status$/,
  /^\/api\/staff\/bookings\/[^/]+\/stay-status$/,
];

const roomMatchers = [
  "/api/admin/add-room",
  "/api/admin/update-room",
  "/api/admin/change-availability",
  "/api/admin/delete-room",
];

const settingsMatchers = [
  "/api/admin/add-building",
  "/api/admin/update-building",
  "/api/admin/delete-building",
  "/api/admin/add-room-type",
  "/api/admin/update-room-type",
  "/api/admin/delete-room-type",
];

const packageMatchers = [
  "/api/admin/add-package",
  /^\/api\/admin\/update-package\/[^/]+$/,
  /^\/api\/admin\/delete-package\/[^/]+$/,
];

const usersMatchers = [
  "/api/user/register",
  "/api/admin/add-guest",
  "/api/admin/create-staff",
  "/api/admin/update-staff",
];

const reviewMatchers = [
  "/api/user/rate-booking",
  "/api/booking/rate-booking",
  /^\/api\/reviews\/toggle\/[^/]+$/,
  /^\/api\/reviews\/reply\/[^/]+$/,
  /^\/api\/reviews\/reply\/[^/]+\/[^/]+$/,
  /^\/api\/reviews\/edit-reply\/[^/]+$/,
  /^\/api\/reviews\/delete-reply\/[^/]+$/,
  /^\/api\/reviews\/[^/]+$/,
];

const notificationMatchers = [
  "/api/notifications/read-all",
  "/api/notifications/clear",
  /^\/api\/notifications\/read\/[^/]+$/,
  /^\/api\/notifications\/[^/]+$/,
];

const buildPayload = (entity, req, action = "") => ({
  entity,
  action: action || req.method.toLowerCase(),
  path: normalizePath(req.originalUrl || req.url),
});

export const dispatchRealtimeMutation = async (req) => {
  const path = normalizePath(req.originalUrl || req.url);

  if (!path) {
    return;
  }

  if (isMatch(path, notificationMatchers)) {
    emitRealtimeUpdate({
      userIds: [req.userId],
      payload: buildPayload("notifications", req),
    });
    return;
  }

  if (isMatch(path, bookingMatchers)) {
    emitRealtimeUpdate({
      rooms: ["public", "admin", "staff"],
      payload: buildPayload("bookings", req),
    });
    return;
  }

  if (isMatch(path, roomMatchers)) {
    emitRealtimeUpdate({
      rooms: ["public", "admin", "staff"],
      payload: buildPayload("rooms", req),
    });
    return;
  }

  if (isMatch(path, settingsMatchers)) {
    emitRealtimeUpdate({
      rooms: ["public", "admin", "staff"],
      payload: buildPayload("settings", req),
    });
    return;
  }

  if (isMatch(path, packageMatchers)) {
    emitRealtimeUpdate({
      rooms: ["public", "admin", "staff"],
      payload: buildPayload("packages", req),
    });
    return;
  }

  if (isMatch(path, usersMatchers)) {
    emitRealtimeUpdate({
      rooms: ["admin", "staff"],
      payload: buildPayload("users", req),
    });
    return;
  }

  if (isMatch(path, reviewMatchers)) {
    emitRealtimeUpdate({
      rooms: ["public", "admin", "staff"],
      payload: buildPayload("reviews", req),
    });
    return;
  }

  if (path === "/api/user/update-profile" || path === "/api/staff/update-profile") {
    emitRealtimeUpdate({
      rooms: ["admin", "staff"],
      userIds: [req.userId],
      payload: buildPayload("profile", req),
    });
    return;
  }

  if (path === "/api/admin/change-user-status") {
    emitRealtimeUpdate({
      rooms: ["admin", "staff"],
      userIds: [req.body?.userId],
      payload: buildPayload("account_status", req),
    });
  }
};
