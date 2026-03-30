import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { createCorsOriginHandler } from "./corsConfig.js";
import { resolveUserDisableState } from "./accountStatus.js";
import {
  getDecodedSessionVersion,
  getSessionVersion,
} from "./sessionVersion.js";

let ioInstance = null;

const DUMMY_ADMIN_ID = "000000000000000000000000";
export const REALTIME_EVENT_NAME = "mrh:update";

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return String(value);
};

const parseTokenFromHandshake = (socket) =>
  socket.handshake.auth?.token ||
  socket.handshake.headers?.authorization?.split(" ")[1] ||
  socket.handshake.headers?.token ||
  socket.handshake.query?.token ||
  "";

const resolveSocketIdentity = async (socket) => {
  const fallbackIdentity = {
    role: "public",
    userId: "",
  };

  const token = parseTokenFromHandshake(socket);
  if (!token) {
    return fallbackIdentity;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const decodedId = normalizeId(decoded?.id);
    const decodedRole = String(decoded?.role || "").trim().toLowerCase();

    if (!decodedId) {
      return fallbackIdentity;
    }

    if (decodedId === DUMMY_ADMIN_ID && decodedRole === "admin") {
      return {
        role: "admin",
        userId: decodedId,
      };
    }

    const user = await userModel.findById(decodedId).select("role disabled disabledUntil disabledReason sessionVersion");
    if (!user) {
      return fallbackIdentity;
    }

    const accountStatus = await resolveUserDisableState(user);
    if (accountStatus.isDisabled) {
      return fallbackIdentity;
    }

    if (getSessionVersion(user) !== getDecodedSessionVersion(decoded)) {
      return fallbackIdentity;
    }

    return {
      role: String(user.role || decodedRole || "guest").trim().toLowerCase(),
      userId: normalizeId(user._id),
    };
  } catch (error) {
    console.error("Realtime auth handshake error:", error.message);
    return fallbackIdentity;
  }
};

const joinRealtimeRooms = (socket, identity) => {
  socket.join("public");

  if (identity.role === "admin") {
    socket.join("admin");
  }

  if (identity.role === "staff") {
    socket.join("staff");
  }

  if (identity.userId) {
    socket.join(`user:${identity.userId}`);
  }
};

export const initRealtimeServer = (
  httpServer,
  { corsConfig = {} } = {}
) => {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(httpServer, {
    cors: {
      origin: createCorsOriginHandler(corsConfig, "Realtime"),
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    socket.data.identity = await resolveSocketIdentity(socket);
    next();
  });

  ioInstance.on("connection", (socket) => {
    joinRealtimeRooms(socket, socket.data.identity || {});
    socket.emit("mrh:connected", {
      role: socket.data.identity?.role || "public",
      userId: socket.data.identity?.userId || "",
    });
  });

  return ioInstance;
};

export const getRealtimeServer = () => ioInstance;

export const emitRealtimeUpdate = ({
  rooms = [],
  userIds = [],
  payload = {},
} = {}) => {
  if (!ioInstance) {
    return;
  }

  const normalizedRooms = [...new Set((rooms || []).map((room) => String(room || "").trim()).filter(Boolean))];
  const normalizedUserIds = [...new Set((userIds || []).map(normalizeId).filter(Boolean))];
  const eventPayload = {
    at: new Date().toISOString(),
    ...payload,
  };
  const targets = [
    ...normalizedRooms,
    ...normalizedUserIds.map((userId) => `user:${userId}`),
  ];

  if (!targets.length) {
    return;
  }

  const broadcast = targets.reduce((operator, room) => operator.to(room), ioInstance);
  broadcast.emit(REALTIME_EVENT_NAME, eventPayload);
};
