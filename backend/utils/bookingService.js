import mongoose from "mongoose";
import bookingModel from "../models/bookingModel.js";
import packageModel from "../models/packageModel.js";
import roomModel from "../models/roomModel.js";
import {
  addDays,
  isRoomPackageType,
  isVenuePackageType,
  normalizeDate,
  rangesOverlap,
} from "./bookingRules.js";
import {
  BOOKING_DATE_SELECT,
  getBookingCheckInDate,
  getBookingCheckOutDate,
} from "./bookingDateFields.js";

const ROOM_LOCK_WINDOW_MS = 30 * 1000;

const toObjectIdString = (value) => String(value || "").trim();

const buildNormalizedBookingItems = (bookingItems = []) =>
  Array.isArray(bookingItems)
    ? bookingItems.map((item) => ({
        ...item,
        roomId: item.roomId,
        packageId: item.packageId,
        participants: Number(item.participants || 0),
      }))
    : [];

const buildUniqueIdList = (values = []) => [
  ...new Set(values.map((value) => toObjectIdString(value)).filter(Boolean)),
];

const acquireRoomBookingLocks = async (roomIds, lockToken) => {
  if (!roomIds.length) return [];

  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + ROOM_LOCK_WINDOW_MS);
  const acquiredRoomIds = [];

  for (const roomId of [...roomIds].sort()) {
    const result = await roomModel.updateOne(
      {
        _id: roomId,
        $or: [
          { bookingLockToken: null },
          { bookingLockToken: { $exists: false } },
          { bookingLockExpiresAt: null },
          { bookingLockExpiresAt: { $exists: false } },
          { bookingLockExpiresAt: { $lt: now } },
          { bookingLockToken: lockToken },
        ],
      },
      {
        $set: {
          bookingLockToken: lockToken,
          bookingLockExpiresAt: lockExpiresAt,
        },
      }
    );

    if (result.modifiedCount !== 1) {
      if (acquiredRoomIds.length) {
        await releaseRoomBookingLocks(acquiredRoomIds, lockToken);
      }

      throw new Error(
        "One or more selected rooms are currently being reserved. Please try again."
      );
    }

    acquiredRoomIds.push(roomId);
  }

  return acquiredRoomIds;
};

const releaseRoomBookingLocks = async (roomIds, lockToken) => {
  if (!roomIds.length) return;

  await roomModel.updateMany(
    {
      _id: { $in: roomIds },
      bookingLockToken: lockToken,
    },
    {
      $set: {
        bookingLockToken: null,
        bookingLockExpiresAt: null,
      },
    }
  );
};

const findConflictingBookings = async (roomIds, start, end) => {
  if (!roomIds.length) return [];

  const bookings = await bookingModel.find(
    {
      "bookingItems.roomId": { $in: roomIds },
      status: { $in: ["pending", "approved"] },
    },
    `${BOOKING_DATE_SELECT} bookingItems`
  );

  return bookings.filter((booking) => {
    const existingStart = normalizeDate(getBookingCheckInDate(booking));
    const existingEnd = normalizeDate(getBookingCheckOutDate(booking));
    const cleaningEnd = normalizeDate(addDays(existingEnd, 1));
    return rangesOverlap(existingStart, cleaningEnd, start, end);
  });
};

const createValidatedBooking = async ({
  userId,
  bookingName,
  bookingItems = [],
  checkInDate,
  checkOutDate,
  venueParticipants = 0,
  extraPackages = [],
}) => {
  const normalizedBookingItems = buildNormalizedBookingItems(bookingItems);

  if (!normalizedBookingItems.length && Number(venueParticipants) <= 0) {
    throw new Error("Please add room selection or venue participants");
  }

  const uniqueRooms = buildUniqueIdList(
    normalizedBookingItems.map((item) => item.roomId)
  );
  const uniquePackages = buildUniqueIdList(
    normalizedBookingItems.map((item) => item.packageId)
  );
  const uniqueExtraPackages = buildUniqueIdList(extraPackages);

  if (uniqueRooms.length !== normalizedBookingItems.length) {
    throw new Error("Duplicate rooms are not allowed in one booking");
  }

  const [roomDocs, packageDocs, extraPackageDocs] = await Promise.all([
    uniqueRooms.length
      ? roomModel
          .find({ _id: { $in: uniqueRooms } })
          .select("_id roomTypeId capacity available")
      : Promise.resolve([]),
    uniquePackages.length
      ? packageModel
          .find({ _id: { $in: uniquePackages } })
          .select("_id packageType roomTypeId price")
      : Promise.resolve([]),
    uniqueExtraPackages.length
      ? packageModel
          .find({ _id: { $in: uniqueExtraPackages } })
          .select("_id packageType roomTypeId price")
      : Promise.resolve([]),
  ]);

  if (roomDocs.length !== uniqueRooms.length) {
    throw new Error("One or more selected rooms are invalid");
  }

  if (packageDocs.length !== uniquePackages.length) {
    throw new Error("Invalid package selected");
  }

  if (extraPackageDocs.length !== uniqueExtraPackages.length) {
    throw new Error("Invalid package selected");
  }

  const roomById = new Map(roomDocs.map((room) => [String(room._id), room]));
  const packageById = new Map(packageDocs.map((pkg) => [String(pkg._id), pkg]));

  for (const item of normalizedBookingItems) {
    if (!item.roomId || !item.packageId || !item.participants) {
      throw new Error(
        "Each room selection must include a room, package, and participants"
      );
    }

    const room = roomById.get(String(item.roomId));
    const pkg = packageById.get(String(item.packageId));

    if (!room || room.available === false) {
      throw new Error("One or more selected rooms are unavailable");
    }

    if (!pkg || !isRoomPackageType(pkg.packageType)) {
      throw new Error("Each selected room must use a valid room package");
    }

    if (String(pkg.roomTypeId || "") !== String(room.roomTypeId || "")) {
      throw new Error("Selected package does not match the room type");
    }

    if (Number(item.participants) > Number(room.capacity || 0)) {
      throw new Error("Selected participants exceed the room capacity");
    }
  }

  if (extraPackageDocs.some((pkg) => isRoomPackageType(pkg.packageType))) {
    throw new Error(
      "Room packages must be selected per room, not as extra packages"
    );
  }

  if (!normalizedBookingItems.length) {
    if (!extraPackageDocs.length) {
      throw new Error("Please select a venue retreat package");
    }

    const hasVenuePackage = extraPackageDocs.some((pkg) =>
      isVenuePackageType(pkg.packageType)
    );

    if (!hasVenuePackage) {
      throw new Error("Please select a venue retreat package");
    }
  }

  const start = normalizeDate(checkInDate);
  const end = normalizeDate(checkOutDate);
  const today = normalizeDate(new Date());

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date range");
  }

  if (start < today) {
    throw new Error("Past dates not allowed");
  }

  if (end < start) {
    throw new Error("Invalid date range");
  }

  if (end.getTime() === start.getTime() && normalizedBookingItems.length) {
    throw new Error("Rooms are not available for same-day bookings");
  }

  const lockToken = new mongoose.Types.ObjectId().toString();
  const lockedRoomIds = await acquireRoomBookingLocks(uniqueRooms, lockToken);

  try {
    const conflictingBookings = await findConflictingBookings(uniqueRooms, start, end);

    if (conflictingBookings.length) {
      throw new Error(
        "One or more selected rooms are already booked (includes cleaning day)"
      );
    }

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
    let totalPrice = 0;

    for (const item of normalizedBookingItems) {
      const pkg = packageById.get(String(item.packageId));
      if (!pkg) {
        throw new Error("Invalid package selected");
      }

      const subtotal = Number(pkg.price || 0) * Number(item.participants || 0) * days;
      item.subtotal = subtotal;
      totalPrice += subtotal;
    }

    if (extraPackageDocs.length) {
      const participantsForExtras = normalizedBookingItems.length
        ? normalizedBookingItems.reduce(
            (sum, item) => sum + Number(item.participants || 0),
            0
          )
        : Number(venueParticipants) || 0;

      for (const pkg of extraPackageDocs) {
        totalPrice += Number(pkg.price || 0) * participantsForExtras * days;
      }
    }

    const booking = await bookingModel.create({
      userId,
      bookingName: String(bookingName || "").trim() || "Reservation",
      bookingItems: normalizedBookingItems,
      extraPackages: uniqueExtraPackages,
      venueParticipants: Number(venueParticipants) || 0,
      checkInDate: start,
      checkOutDate: end,
      checkIn: false,
      checkOut: false,
      totalPrice,
      status: "pending",
      payment: false,
      paymentStatus: "unpaid",
    });

    return booking;
  } finally {
    await releaseRoomBookingLocks(lockedRoomIds, lockToken);
  }
};

export { createValidatedBooking };
