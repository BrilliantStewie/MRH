import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import buildingModel from "../models/buildingModel.js";
import roomTypeModel from "../models/roomtypeModel.js";
import Review from "../models/reviewModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const APPLY = process.argv.includes("--apply");
const { ObjectId } = mongoose.Types;

const normalizeName = (value) => String(value || "").trim().toLowerCase();
const isRoomPackageType = (value) =>
  String(value || "").trim().toLowerCase() === "room package";

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof ObjectId) return value;
  if (typeof value === "object" && value._id) return toObjectId(value._id);
  if (typeof value === "string" && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }
  return null;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildUpdate = (setOps, unsetOps) => {
  const update = {};
  if (Object.keys(setOps).length > 0) update.$set = setOps;
  if (Object.keys(unsetOps).length > 0) update.$unset = unsetOps;
  return Object.keys(update).length > 0 ? update : null;
};

const parseStringArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
};

const parseObjectIdArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toObjectId(item))
    .filter(Boolean);
};

const logHeader = (message) => {
  console.log(`\n${message}`);
};

const connect = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in backend/.env");
  }
  await mongoose.connect(process.env.MONGODB_URI);
};

const migrateRooms = async (db, referenceMaps, stats) => {
  logHeader("Checking rooms");
  const collection = db.collection("rooms");

  for await (const room of collection.find({})) {
    const setOps = {};
    const unsetOps = {};

    let buildingId = toObjectId(room.buildingId || room.building_id);
    if (buildingId && !referenceMaps.validBuildingIds.has(String(buildingId))) {
      buildingId = null;
    }
    if (!buildingId) {
      buildingId = referenceMaps.buildingIdsByName.get(normalizeName(room.building));
    }

    let roomTypeId = toObjectId(room.roomTypeId || room.room_type_id);
    if (roomTypeId && !referenceMaps.validRoomTypeIds.has(String(roomTypeId))) {
      roomTypeId = null;
    }
    if (!roomTypeId) {
      roomTypeId =
        referenceMaps.roomTypeIdsByName.get(normalizeName(room.roomType)) ||
        referenceMaps.roomTypeIdsByName.get(normalizeName(room.room_type));
    }

    if (buildingId && String(room.buildingId || "") !== String(buildingId)) {
      setOps.buildingId = buildingId;
    }
    if (roomTypeId && String(room.roomTypeId || "") !== String(roomTypeId)) {
      setOps.roomTypeId = roomTypeId;
    }

    const coverImage =
      room.coverImage ||
      room.cover_image ||
      (Array.isArray(room.images) && room.images.length > 0 ? room.images[0] : "");
    if (coverImage && room.coverImage !== coverImage) {
      setOps.coverImage = coverImage;
    }

    if (buildingId && room.building !== undefined) unsetOps.building = "";
    if (room.building_id !== undefined) unsetOps.building_id = "";
    if (roomTypeId && room.roomType !== undefined) unsetOps.roomType = "";
    if (room.room_type !== undefined) unsetOps.room_type = "";
    if (room.cover_image !== undefined) unsetOps.cover_image = "";

    const update = buildUpdate(setOps, unsetOps);
    if (update) {
      stats.rooms.updated += 1;
      if (APPLY) {
        await collection.updateOne({ _id: room._id }, update);
      }
    }

    if (!buildingId || !roomTypeId) {
      stats.rooms.unresolved.push({
        roomId: String(room._id),
        name: room.name || "",
        building: room.building || "",
        roomType: room.roomType || room.room_type || "",
      });
    }
  }
};

const migratePackages = async (db, referenceMaps, stats) => {
  logHeader("Checking packages");
  const collection = db.collection("packages");

  for await (const pkg of collection.find({})) {
    const setOps = {};
    const unsetOps = {};
    const packageType = pkg.packageType || "";
    const shouldUseRoomType = isRoomPackageType(packageType);

    let roomTypeId = toObjectId(pkg.roomTypeId || pkg.room_type_id);
    if (roomTypeId && !referenceMaps.validRoomTypeIds.has(String(roomTypeId))) {
      roomTypeId = null;
    }
    if (!roomTypeId && shouldUseRoomType) {
      roomTypeId = toObjectId(pkg.roomType || pkg.room_type);
    }
    if (roomTypeId && !referenceMaps.validRoomTypeIds.has(String(roomTypeId))) {
      roomTypeId = null;
    }
    if (!roomTypeId && shouldUseRoomType) {
      roomTypeId =
        referenceMaps.roomTypeIdsByName.get(normalizeName(pkg.roomType)) ||
        referenceMaps.roomTypeIdsByName.get(normalizeName(pkg.room_type));
    }

    if (shouldUseRoomType) {
      if (roomTypeId && String(pkg.roomTypeId || "") !== String(roomTypeId)) {
        setOps.roomTypeId = roomTypeId;
      }
    } else if (pkg.roomTypeId !== null) {
      setOps.roomTypeId = null;
    }

    if ((shouldUseRoomType && roomTypeId) || !shouldUseRoomType) {
      if (pkg.roomType !== undefined) unsetOps.roomType = "";
      if (pkg.room_type !== undefined) unsetOps.room_type = "";
      if (pkg.room_type_id !== undefined) unsetOps.room_type_id = "";
    }

    const update = buildUpdate(setOps, unsetOps);
    if (update) {
      stats.packages.updated += 1;
      if (APPLY) {
        await collection.updateOne({ _id: pkg._id }, update);
      }
    }

    if (shouldUseRoomType && !roomTypeId) {
      stats.packages.unresolved.push({
        packageId: String(pkg._id),
        name: pkg.name || "",
        roomType: pkg.roomType || pkg.room_type || "",
      });
    }
  }
};

const buildNormalizedBookingItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ...item,
    roomId: toObjectId(item.roomId || item.room_id) || item.roomId || item.room_id || null,
    packageId: toObjectId(item.packageId || item.package_id) || item.packageId || item.package_id || null,
    participants: Number(item.participants || 0),
    subtotal: Number(item.subtotal || 0),
  }));
};

const buildLegacyReviewPayload = (booking) => {
  const rating = Number(booking.rating || 0);
  const comment = String(booking.review || "").trim();
  const reviewChat = Array.isArray(booking.reviewChat)
    ? booking.reviewChat
        .map((chat) => ({
          senderId:
            (chat.senderRole || "guest") === "guest"
              ? toObjectId(booking.userId || booking.user_id)
              : toObjectId(chat.senderId),
          senderRole: ["admin", "staff", "guest"].includes(chat.senderRole)
            ? chat.senderRole
            : "guest",
          message: String(chat.message || "").trim(),
          parentReplyId: toObjectId(chat.parentReplyId),
          isEdited: Boolean(chat.isEdited),
          createdAt: toDate(chat.createdAt) || toDate(booking.updatedAt) || toDate(booking.createdAt) || new Date(),
          editHistory: Array.isArray(chat.editHistory)
            ? chat.editHistory
                .map((entry) => ({
                  message: String(entry?.message || "").trim(),
                  editedAt: toDate(entry?.editedAt) || new Date(),
                }))
                .filter((entry) => entry.message)
            : [],
        }))
        .filter((chat) => chat.message)
    : [];

  if (rating < 1 || rating > 5 || (!comment && reviewChat.length === 0)) {
    return null;
  }

  const fallbackComment =
    comment ||
    reviewChat.find((chat) => chat.senderRole === "guest")?.message ||
    "Legacy review";

  return {
    bookingId: booking._id,
    userId: toObjectId(booking.userId || booking.user_id),
    rating,
    comment: fallbackComment,
    images: parseStringArray(booking.reviewImages),
    isHidden: false,
    isEdited: false,
    reviewChat,
    createdAt: toDate(booking.createdAt) || new Date(),
    updatedAt: toDate(booking.updatedAt) || new Date(),
  };
};

const migrateBookings = async (db, stats) => {
  logHeader("Checking bookings");
  const collection = db.collection("bookings");

  for await (const booking of collection.find({})) {
    const setOps = {};
    const unsetOps = {};

    const userId = toObjectId(booking.userId || booking.user_id);
    const checkIn = booking.checkIn || booking.check_in || null;
    const checkOut = booking.checkOut || booking.check_out || null;
    const totalPrice = booking.totalPrice ?? booking.total_price ?? 0;
    const payment = booking.paymentStatus === "paid";
    const extraPackages = parseObjectIdArray(
      booking.extraPackages || booking.extra_packages || []
    );
    const bookingItems = buildNormalizedBookingItems(booking.bookingItems);

    if (userId && String(booking.userId || "") !== String(userId)) {
      setOps.userId = userId;
    }
    if (checkIn && !booking.checkIn) {
      setOps.checkIn = checkIn;
    }
    if (checkOut && !booking.checkOut) {
      setOps.checkOut = checkOut;
    }
    if (booking.totalPrice === undefined && totalPrice !== undefined) {
      setOps.totalPrice = totalPrice;
    }
    if (Array.isArray(extraPackages) && extraPackages.length && !Array.isArray(booking.extraPackages)) {
      setOps.extraPackages = extraPackages;
    }
    if (
      Array.isArray(booking.bookingItems) &&
      booking.bookingItems.some((item) => item.room_id !== undefined || item.package_id !== undefined)
    ) {
      setOps.bookingItems = bookingItems;
    }
    if (booking.payment !== payment) {
      setOps.payment = payment;
    }

    if (booking.user_id !== undefined) unsetOps.user_id = "";
    if (booking.check_in !== undefined) unsetOps.check_in = "";
    if (booking.check_out !== undefined) unsetOps.check_out = "";
    if (booking.total_price !== undefined) unsetOps.total_price = "";
    if (booking.extra_packages !== undefined) unsetOps.extra_packages = "";

    const legacyReview = buildLegacyReviewPayload({
      ...booking,
      userId: userId || booking.userId || booking.user_id,
    });
    const hasLegacyReviewContent =
      Number(booking.rating || 0) > 0 ||
      String(booking.review || "").trim() ||
      (Array.isArray(booking.reviewChat) &&
        booking.reviewChat.some((chat) => String(chat?.message || "").trim()));

    if (legacyReview?.userId) {
      const existingReview = await Review.findOne({ bookingId: booking._id }).lean();
      if (!existingReview) {
        stats.reviews.pendingMigration += 1;
        if (APPLY) {
          await Review.create(legacyReview);
        }
      } else {
        stats.reviews.alreadyPresent += 1;
      }
    } else if (hasLegacyReviewContent) {
      stats.reviews.unresolved.push({
        bookingId: String(booking._id),
        rating: booking.rating,
        review: booking.review || "",
      });
    }

    if (booking.rating !== undefined) unsetOps.rating = "";
    if (booking.review !== undefined) unsetOps.review = "";
    if (booking.reviewChat !== undefined) unsetOps.reviewChat = "";

    const update = buildUpdate(setOps, unsetOps);
    if (update) {
      stats.bookings.updated += 1;
      if (APPLY) {
        await collection.updateOne({ _id: booking._id }, update);
      }
    }
  }
};

const main = async () => {
  await connect();
  const db = mongoose.connection.db;

  const [buildings, roomTypes] = await Promise.all([
    buildingModel.find({}, "_id name").lean(),
    roomTypeModel.find({}, "_id name").lean(),
  ]);

  const referenceMaps = {
    buildingIdsByName: new Map(
      buildings.map((building) => [normalizeName(building.name), building._id])
    ),
    roomTypeIdsByName: new Map(
      roomTypes.map((roomType) => [normalizeName(roomType.name), roomType._id])
    ),
    validBuildingIds: new Set(buildings.map((building) => String(building._id))),
    validRoomTypeIds: new Set(roomTypes.map((roomType) => String(roomType._id))),
  };

  const stats = {
    mode: APPLY ? "apply" : "dry-run",
    rooms: { updated: 0, unresolved: [] },
    packages: { updated: 0, unresolved: [] },
    bookings: { updated: 0 },
    reviews: { pendingMigration: 0, alreadyPresent: 0, unresolved: [] },
  };

  await migrateRooms(db, referenceMaps, stats);
  await migratePackages(db, referenceMaps, stats);
  await migrateBookings(db, stats);

  logHeader("Migration summary");
  console.log(JSON.stringify(stats, null, 2));

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write changes.");
  }
};

if (path.resolve(process.argv[1] || "") === __filename) {
  main()
    .catch((error) => {
      console.error("\nMigration failed:", error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.connection.close().catch(() => {});
    });
}

export default main;
