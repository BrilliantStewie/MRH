import mongoose from "mongoose";
import Review from "../models/reviewModel.js";
import { getBookingStayFlags, getBookingStayStatus } from "./bookingStay.js";
import {
  getBookingCheckInDate,
  getBookingCheckOutDate,
} from "./bookingDateFields.js";

const { ObjectId } = mongoose.Types;

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const toPlainObject = (value) => {
  if (!value) return value;
  if (typeof value.toObject === "function") {
    return value.toObject({ virtuals: true });
  }
  if (Array.isArray(value)) {
    return value.map((item) => toPlainObject(item));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, toPlainObject(item)])
    );
  }
  return value;
};

export const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const normalizeName = (value) => String(value || "").trim();

export const isValidObjectId = (value) =>
  typeof value === "string" && ObjectId.isValid(value);

export const resolveNamedReference = async (model, value) => {
  if (!value && value !== 0) return null;

  if (isPlainObject(value)) {
    if (value._id) {
      return resolveNamedReference(model, value._id);
    }
    if (value.name) {
      return resolveNamedReference(model, value.name);
    }
  }

  const normalizedValue = normalizeName(value);
  if (!normalizedValue) return null;

  if (isValidObjectId(normalizedValue)) {
    const byId = await model.findById(normalizedValue);
    if (byId) return byId;
  }

  return model.findOne({
    name: { $regex: new RegExp(`^${escapeRegex(normalizedValue)}$`, "i") },
  });
};

const buildUserName = (user) => {
  if (!user || typeof user !== "object") return "";
  if (user.name) return user.name;
  return [user.firstName, user.middleName, user.lastName, user.suffix]
    .filter(Boolean)
    .join(" ")
    .trim();
};

export const roomReferencePopulate = [
  { path: "buildingId", select: "name" },
  { path: "roomTypeId", select: "name" },
];

export const packageReferencePopulate = {
  path: "roomTypeId",
  select: "name",
};

const extractRefId = (value) => {
  if (!value) return null;
  if (isPlainObject(value) && value._id) return value._id;
  return value;
};

export const serializeRoom = (roomDoc) => {
  if (!roomDoc) return roomDoc;

  const room = toPlainObject(roomDoc);
  const buildingDoc = isPlainObject(room.buildingId) ? room.buildingId : null;
  const roomTypeDoc = isPlainObject(room.roomTypeId) ? room.roomTypeId : null;
  const building = room.building || buildingDoc?.name || "";
  const roomType = room.roomType || roomTypeDoc?.name || "";
  const coverImage = room.coverImage || room.images?.[0] || "";

  return {
    ...room,
    buildingId: extractRefId(room.buildingId),
    building,
    roomTypeId: extractRefId(room.roomTypeId),
    roomType,
    coverImage,
  };
};

export const serializePackage = (packageDoc) => {
  if (!packageDoc) return packageDoc;

  const roomPackage = toPlainObject(packageDoc);
  const roomTypeDoc = isPlainObject(roomPackage.roomTypeId)
    ? roomPackage.roomTypeId
    : null;

  return {
    ...roomPackage,
    roomTypeId: extractRefId(roomPackage.roomTypeId),
    roomType: roomTypeDoc || roomPackage.roomType || null,
  };
};

const serializeUser = (userDoc) => {
  if (!userDoc || !isPlainObject(userDoc)) return userDoc;
  const user = toPlainObject(userDoc);
  return {
    ...user,
    name: buildUserName(user),
  };
};

export const serializeBooking = (bookingDoc, reviewDoc = null) => {
  if (!bookingDoc) return bookingDoc;

  const booking = toPlainObject(bookingDoc);
  const review = reviewDoc ? toPlainObject(reviewDoc) : null;
  const user = isPlainObject(booking.userId) ? serializeUser(booking.userId) : booking.userId;
  const checkInConfirmedBy = isPlainObject(booking.checkInConfirmedBy)
    ? serializeUser(booking.checkInConfirmedBy)
    : booking.checkInConfirmedBy;
  const checkOutConfirmedBy = isPlainObject(booking.checkOutConfirmedBy)
    ? serializeUser(booking.checkOutConfirmedBy)
    : booking.checkOutConfirmedBy;
  const extraPackages = (booking.extraPackages || []).map((pkg) =>
    isPlainObject(pkg) ? serializePackage(pkg) : pkg
  );
  const bookingItems = (booking.bookingItems || []).map((item) => {
    const roomValue = item.roomId || null;
    const packageValue = item.packageId || null;
    const serializedRoom = isPlainObject(roomValue) ? serializeRoom(roomValue) : roomValue;
    const serializedPackage = isPlainObject(packageValue)
      ? serializePackage(packageValue)
      : packageValue;

    return {
      ...item,
      roomId: serializedRoom,
      packageId: serializedPackage,
    };
  });

  const reviewChat = Array.isArray(review?.reviewChat)
    ? review.reviewChat.map((chat) => toPlainObject(chat))
    : Array.isArray(booking.reviewChat)
      ? booking.reviewChat.map((chat) => toPlainObject(chat))
      : [];
  const comment = String(review?.comment ?? booking.review ?? booking.comment ?? "");
  const rating = Number(review?.rating ?? booking.rating ?? 0) || 0;
  const { checkIn, checkOut, noShow } = getBookingStayFlags(booking);
  const checkInDate = getBookingCheckInDate(booking);
  const checkOutDate = getBookingCheckOutDate(booking);

  return {
    ...booking,
    userId: user,
    bookingItems,
    extraPackages,
    checkIn,
    checkInConfirmedAt: booking.checkInConfirmedAt || null,
    checkInConfirmedBy,
    checkOut,
    checkOutConfirmedAt: booking.checkOutConfirmedAt || null,
    checkOutConfirmedBy,
    noShow,
    stayStatus: getBookingStayStatus({
      ...booking,
      checkIn,
      checkOut,
      noShow,
    }),
    checkInDate: checkInDate || null,
    checkOutDate: checkOutDate || null,
    totalPrice: booking.totalPrice ?? 0,
    rating,
    review: comment,
    comment,
    reviewId: review?._id || null,
    reviewImages: Array.isArray(review?.images) ? review.images : [],
    reviewChat,
    hasReview: Boolean(review || rating > 0 || comment || reviewChat.length),
  };
};

export const serializeReview = (reviewDoc) => {
  if (!reviewDoc) return reviewDoc;

  const review = toPlainObject(reviewDoc);
  const serializedUser = isPlainObject(review.userId) ? serializeUser(review.userId) : review.userId;
  const serializedBooking = isPlainObject(review.bookingId)
    ? serializeBooking(review.bookingId, review)
    : review.bookingId;

  return {
    ...review,
    userId: serializedUser,
    bookingId: serializedBooking,
  };
};

export const attachReviewDataToBookings = async (bookingDocs) => {
  if (!Array.isArray(bookingDocs) || bookingDocs.length === 0) {
    return [];
  }

  const bookingIds = bookingDocs
    .map((booking) => extractRefId(toPlainObject(booking)?._id))
    .filter(Boolean);

  const reviews = await Review.find({
    bookingId: { $in: bookingIds },
  }).sort({ createdAt: -1 });

  const reviewByBookingId = new Map();
  for (const review of reviews) {
    const key = String(review.bookingId);
    if (!reviewByBookingId.has(key)) {
      reviewByBookingId.set(key, review);
    }
  }

  return bookingDocs.map((booking) =>
    serializeBooking(booking, reviewByBookingId.get(String(extractRefId(toPlainObject(booking)?._id))))
  );
};

export const buildBookingPopulate = () => [
  { path: "userId", select: "name firstName middleName lastName suffix email phone image authProvider" },
  {
    path: "checkInConfirmedBy",
    select: "name firstName middleName lastName suffix role",
  },
  {
    path: "checkOutConfirmedBy",
    select: "name firstName middleName lastName suffix role",
  },
  {
    path: "bookingItems.roomId",
    populate: roomReferencePopulate,
  },
  {
    path: "bookingItems.packageId",
    populate: packageReferencePopulate,
  },
  {
    path: "extraPackages",
    populate: packageReferencePopulate,
  },
];


