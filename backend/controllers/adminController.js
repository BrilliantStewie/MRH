import validator from "validator";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";

// Models
import userModel from "../models/userModel.js";
import roomModel from "../models/roomModel.js";
import bookingModel from "../models/bookingModel.js";
import buildingModel from "../models/buildingModel.js";
import roomTypeModel from "../models/roomtypeModel.js";
import packageModel from "../models/packageModel.js";
import { createOrRefreshNotification } from "../utils/notificationUtils.js";
import {
  buildSessionTokenPayload,
  bumpSessionVersion,
  getSessionVersion,
} from "../utils/sessionVersion.js";

// Utils
import sendEmail from "../utils/sendEmail.js";
import sendSMS from "../utils/sendSMS.js";
import { clearUserDisableState } from "../utils/accountStatus.js";
import {
  attachReviewDataToBookings,
  buildBookingPopulate,
  normalizeName,
  resolveNamedReference,
  roomReferencePopulate,
  serializeRoom,
} from "../utils/dataConsistency.js";
import { getBookingCheckInDate } from "../utils/bookingDateFields.js";

// ======================================================================
// 🛠️ CLOUD HELPER
// ======================================================================
const streamUpload = (fileBuffer, folderName = "mrh_rooms") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: folderName, resource_type: "image" },
            (error, result) => {
                if (result) resolve(result.secure_url);
                else reject(error);
            }
        );
        stream.end(fileBuffer);
    });
};

const formatPHNumber = (number) => {
  if (!number) return null;

  if (number.startsWith("+63")) {
    return "0" + number.substring(3);
  }

  return number;
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const normalizePHPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  if (digits.length === 10 && digits.startsWith("9")) {
    return `0${digits}`;
  }
  return digits;
};

const isValidPHPhone = (value) => /^09\d{9}$/.test(value);

const buildPhoneCandidates = (value) => {
  const rawDigits = String(value || "").replace(/\D/g, "");
  const normalized = normalizePHPhone(value);
  const candidates = new Set();

  if (rawDigits) candidates.add(rawDigits);
  if (normalized) candidates.add(normalized);

  if (normalized && normalized.startsWith("0") && normalized.length === 11) {
    candidates.add(normalized.slice(1));
    candidates.add(`63${normalized.slice(1)}`);
  }

  return Array.from(candidates);
};

const parseAmenities = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const resolveBuildingDoc = async (value) =>
  resolveNamedReference(buildingModel, value);

const resolveRoomTypeDoc = async (value) =>
  resolveNamedReference(roomTypeModel, value);

const normalizeRoomTypeName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const getRoomCapacityValidationMessage = (roomTypeName, rawCapacity) => {
  const normalizedType = normalizeRoomTypeName(roomTypeName);
  const capacity = Number(rawCapacity);

  if (!Number.isFinite(capacity) || capacity < 1) {
    return "Room capacity must be at least 1.";
  }

  if (normalizedType === "individual" && capacity !== 1) {
    return "Individual rooms must have exactly 1 guest capacity.";
  }

  if (normalizedType === "individual with pullout" && capacity > 2) {
    return "Individual with Pullout rooms cannot have more than 2 guest capacity.";
  }

  if (normalizedType === "dormitory" && capacity < 3) {
    return "Dormitory rooms must have at least 3 guest capacity.";
  }

  return "";
};

// ======================================================================
// 🔐 AUTHENTICATION
// ======================================================================

const loginAdmin = async (req, res) => {
    try {
  
      const normalizedEmail = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");

      if (!normalizedEmail || !password) {
        return res.json({
          success: false,
          message: "Email and password are required"
        });
      }
  
      // Find admin in database
      const admin = await userModel.findOne({
        email: normalizedEmail,
        role: "admin"
      });

      if (!admin) {
        return res.json({
          success: false,
          message: "Admin not found"
        });
      }

      if (admin.disabled) {
        return res.json({
          success: false,
          message: "Your account has been disabled."
        });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Create token
    const token = jwt.sign(
      buildSessionTokenPayload({
        id: admin._id,
        role: admin.role,
        name: `${admin.firstName || "Admin"} ${admin.lastName || ""}`.trim(),
        sessionVersion: getSessionVersion(admin),
      }),
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      token
    });

  } catch (error) {
    console.error(error);
    res.json({
      success: false,
      message: error.message
    });
  }
};

const verifyAdminSession = async (req, res) => {
  res.json({ success: true });
};

export default loginAdmin;

// ======================================================================
// 📊 DASHBOARD & ANALYTICS
// ======================================================================

const adminDashboard = async (req, res) => {
    try {
        const [userCount, staffCount, roomCount, bookings] = await Promise.all([
            userModel.countDocuments({ role: 'guest' }),
            userModel.countDocuments({ role: 'staff' }),
            roomModel.countDocuments({}),
            bookingModel.find({}).sort({ date: -1 })
        ]);

        const dashData = {
            users: userCount,
            staff: staffCount,
            rooms: roomCount,
            bookings: bookings.length,
            latestBookings: bookings.slice(0, 5)
        };

        res.json({ success: true, dashData });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

// ======================================================================
// 👥 USER & STAFF MANAGEMENT
// ======================================================================

const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.find({})
            .select("-password")
            .sort({ createdAt: -1 });
        res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const getAllStaff = async (req, res) => {
    try {
        const staff = await userModel.find({ role: 'staff' })
            .select("-password")
            .sort({ createdAt: -1 });
        res.json({ success: true, staff });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const addGuestUser = async (req, res) => {
    try {
        const {
            firstName,
            middleName = "",
            lastName,
            suffix = "",
            email,
            password,
            phone
        } = req.body;

        const normalizedFirstName = normalizeName(firstName);
        const normalizedMiddleName = normalizeName(middleName);
        const normalizedLastName = normalizeName(lastName);
        const normalizedSuffix = normalizeName(suffix);
        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = normalizePHPhone(phone);

        if (!normalizedFirstName || !normalizedLastName || !normalizedEmail || !password) {
            return res.json({
                success: false,
                message: "First name, last name, email, and password are required"
            });
        }

        if (!validator.isEmail(normalizedEmail)) {
            return res.json({ success: false, message: "Invalid email format" });
        }

        if (password.length < 8) {
            return res.json({ success: false, message: "Password must be at least 8 characters" });
        }

        if (normalizedPhone && !isValidPHPhone(normalizedPhone)) {
            return res.json({ success: false, message: "Invalid phone number" });
        }

        const existingEmailUser = await userModel.findOne({ email: normalizedEmail });
        if (existingEmailUser) {
            return res.json({ success: false, message: "Email already exists" });
        }

        if (normalizedPhone) {
            const existingPhoneUser = await userModel.findOne({
                phone: { $in: buildPhoneCandidates(normalizedPhone) }
            });

            if (existingPhoneUser) {
                return res.json({ success: false, message: "Phone number already exists" });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            firstName: normalizedFirstName,
            middleName: normalizedMiddleName,
            lastName: normalizedLastName,
            suffix: normalizedSuffix,
            email: normalizedEmail,
            password: hashedPassword,
            passwordSet: true,
            phone: normalizedPhone || null,
            role: 'guest',
            image: "",
            emailVerified: true,
            phoneVerified: Boolean(normalizedPhone)
        });

        await newUser.save();
        res.json({ success: true, message: "Guest User Created" });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

const createStaff = async (req, res) => {
    try {
        const { firstName, lastName, middleName, suffix, email, password, phone } = req.body;
        const imageFile = req.file;

        if (!firstName || !lastName || !email || !password) {
            return res.json({ success: false, message: "Missing required fields" });
        }

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Invalid email" });
        }

        const exists = await userModel.findOne({ email });
        if (exists) {
            return res.json({ success: false, message: "User already exists" });
        }

        let imageUrl = ""; 
        if (imageFile) {
            imageUrl = await streamUpload(imageFile.buffer, "mrh_staff");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newStaff = new userModel({
            firstName,
            lastName,
            middleName,
            suffix,
            email,
            password: hashedPassword,
            phone,
            image: imageUrl,
            role: 'staff',
            emailVerified: true,
            phoneVerified: Boolean(phone),
            sessionVersion: 0
        });

        await newStaff.save();
        res.json({ success: true, message: "Staff Member Created" });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

const updateStaff = async (req, res) => {
    try {
        const { id, firstName, lastName, middleName, suffix, phone, removeImage, password } = req.body;
        const imageFile = req.file;

        const staff = await userModel.findById(id);
        if (!staff) {
            return res.json({ success: false, message: "Staff not found" });
        }

        if (firstName) staff.firstName = firstName;
        if (lastName) staff.lastName = lastName;
        if (middleName !== undefined) staff.middleName = middleName; 
        if (suffix !== undefined) staff.suffix = suffix;
        if (phone) staff.phone = phone;

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            staff.password = await bcrypt.hash(password, salt);
            bumpSessionVersion(staff);
        }

        if (imageFile) {
            staff.image = await streamUpload(imageFile.buffer, "mrh_staff");
        } else if (removeImage === "true") {
            staff.image = ""; 
        }

        await staff.save();
        res.json({ 
            success: true, 
            message: password ? "Staff updated and security sessions reset" : "Staff Updated Successfully" 
        });

    } catch (error) {
        console.error("Update Staff Error:", error);
        res.json({ success: false, message: error.message });
    }
};

const changeUserStatus = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // Toggle status
    user.disabled = !user.disabled;
    if (!user.disabled) {
      clearUserDisableState(user);
    } else {
      user.disabledUntil = null;
      user.disabledReason = "";
    }
    await user.save();


    // 🔔 In-app notification

    // 📧 Email
    await sendEmail(
      user.email,
      "Account status update - Mercedarian Retreat House",
      `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <p>Hello ${user.firstName || "User"},</p>
        <p>Your account is now ${user.disabled ? "disabled" : "active"}.</p>
        ${
          user.disabled
            ? "<p>If you believe this is a mistake, please contact us.</p>"
            : "<p>You can sign in anytime.</p>"
        }
        <p>Mercedarian Retreat House</p>
      </div>
      `
    );

    // 📱 SMS (ONLY if phone exists)
    if (user.phone) {
      try {
        await sendSMS(
          formatPHNumber(user.phone),
          user.disabled
            ? "Your MRH account has been disabled. Contact administration."
            : "Your MRH account has been reactivated."
        );
      } catch (smsError) {
        console.error("SMS failed but continuing:", smsError.message);
      }
    }

    res.json({
      success: true,
      message: `User is now ${user.disabled ? "Disabled" : "Enabled"}`
    });

  } catch (error) {
    console.error("Change User Status Error:", error);
    res.json({ success: false, message: error.message });
  }
};

// ======================================================================
// 🛏️ ROOM MANAGEMENT
// ======================================================================

const addRoom = async (req, res) => {
    try {
        const { name, building, buildingId: providedBuildingId, capacity, description, amenities } = req.body;
        const roomTypeInput = req.body.roomTypeId || req.body.roomType;
        const normalizedName = normalizeName(name);

        const [buildingDoc, roomTypeDoc] = await Promise.all([
            resolveBuildingDoc(providedBuildingId || building),
            resolveRoomTypeDoc(roomTypeInput),
        ]);

        if (!normalizedName || !buildingDoc || !roomTypeDoc || !capacity || !description) {
            return res.json({ success: false, message: "All fields are required" });
        }

        const parsedCapacity = Number(capacity);
        const capacityValidationMessage = getRoomCapacityValidationMessage(
            roomTypeDoc.name,
            parsedCapacity
        );

        if (capacityValidationMessage) {
            return res.json({ success: false, message: capacityValidationMessage });
        }

        const imageFiles = req.files || [];
        const imagesUrl = await Promise.all(
            imageFiles.map(item => streamUpload(item.buffer, "mrh_rooms"))
        );

        const roomData = {
            name: normalizedName,
            roomTypeId: roomTypeDoc._id,
            buildingId: buildingDoc._id,
            capacity: parsedCapacity,
            description,
            amenities: parseAmenities(amenities),
            images: imagesUrl,
            coverImage: imagesUrl[0] || "",
            available: true
        };

        const newRoom = await roomModel.create(roomData);
        const populatedRoom = await roomModel
            .findById(newRoom._id)
            .populate(roomReferencePopulate);

        res.json({
            success: true,
            message: "Room Added Successfully",
            room: serializeRoom(populatedRoom)
        });

    } catch (error) {
        console.log("Add Room Error:", error);
        res.json({ success: false, message: error.message });
    }
};

const updateRoom = async (req, res) => {
    try {
        const roomId = req.body.roomId || req.body.id; 
        const { name, building, buildingId: providedBuildingId, capacity, description, amenities, existingImages } = req.body;
        const roomTypeInput = req.body.roomTypeId || req.body.roomType;

        const room = await roomModel.findById(roomId);
        if (!room) {
            return res.json({ success: false, message: "Room not found" });
        }

        const [buildingDoc, roomTypeDoc] = await Promise.all([
            providedBuildingId || building ? resolveBuildingDoc(providedBuildingId || building) : Promise.resolve(null),
            roomTypeInput ? resolveRoomTypeDoc(roomTypeInput) : Promise.resolve(null),
        ]);

        if ((providedBuildingId || building) && !buildingDoc) {
            return res.json({ success: false, message: "Selected building does not exist" });
        }

        if (roomTypeInput && !roomTypeDoc) {
            return res.json({ success: false, message: "Selected room type does not exist" });
        }

        const effectiveRoomTypeName = roomTypeDoc?.name || room.roomTypeId?.name || (
            await roomTypeModel.findById(room.roomTypeId).lean()
        )?.name;
        const effectiveCapacity =
            capacity !== undefined && capacity !== null && capacity !== ""
                ? Number(capacity)
                : Number(room.capacity);
        const capacityValidationMessage = getRoomCapacityValidationMessage(
            effectiveRoomTypeName,
            effectiveCapacity
        );

        if (capacityValidationMessage) {
            return res.json({ success: false, message: capacityValidationMessage });
        }

        if (name) room.name = normalizeName(name);
        if (roomTypeDoc) room.roomTypeId = roomTypeDoc._id;
        if (buildingDoc) room.buildingId = buildingDoc._id;
        if (capacity !== undefined && capacity !== null && capacity !== "") {
            room.capacity = effectiveCapacity;
        }
        if (description) room.description = description;
        
        if (amenities !== undefined) {
            room.amenities = parseAmenities(amenities);
        }

        let finalImages = Array.isArray(room.images) ? [...room.images] : [];
        if (existingImages !== undefined) {
            try { finalImages = JSON.parse(existingImages); } catch { finalImages = []; }
        }

        const imageFiles = req.files || [];
        if (imageFiles.length > 0) {
            const newImageUrls = await Promise.all(
                imageFiles.map(item => streamUpload(item.buffer, "mrh_rooms"))
            );
            finalImages = [...finalImages, ...newImageUrls];
        }

        room.images = finalImages;
        room.coverImage = finalImages[0] || room.coverImage || "";

        await room.save();
        const populatedRoom = await roomModel
            .findById(room._id)
            .populate(roomReferencePopulate);
        res.json({
            success: true,
            message: "Room Updated Successfully",
            room: serializeRoom(populatedRoom)
        });

    } catch (error) {
        console.log("Update Room Error:", error);
        res.json({ success: false, message: error.message });
    }
};

const getAllRooms = async (req, res) => {
    try {
        const rooms = await roomModel
            .find({})
            .populate(roomReferencePopulate)
            .sort({ createdAt: -1 });

        res.json({ success: true, rooms: rooms.map((room) => serializeRoom(room)) });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const changeAvailability = async (req, res) => {
    try {
        const { roomId } = req.body;
        const room = await roomModel.findById(roomId);
        if (!room) return res.json({ success: false, message: "Room not found" });
        
        room.available = !room.available;
        await room.save();
        res.json({ success: true, message: "Availability Changed" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const deleteRoom = async (req, res) => {
    try {
        const id = req.body.id || req.params.id;

        const bookingExists = await bookingModel.exists({
            "bookingItems.roomId": id
        });

        if (bookingExists) {
            return res.json({
                success: false,
                message: "Room is linked to existing bookings and cannot be deleted"
            });
        }

        const deletedRoom = await roomModel.findByIdAndDelete(id);
        if (!deletedRoom) {
            return res.json({ success: false, message: "Room not found" });
        }

        res.json({ success: true, message: "Room Deleted" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ======================================================================
// 📅 BOOKING MANAGEMENT
// ======================================================================

const allBookings = async (req, res) => {
    try {
        let bookingsQuery = bookingModel.find({}).sort({ createdAt: -1 });
        for (const populateConfig of buildBookingPopulate()) {
            bookingsQuery = bookingsQuery.populate(populateConfig);
        }

        const bookings = await bookingsQuery;
        const normalizedBookings = await attachReviewDataToBookings(bookings);

        res.json({ success: true, bookings: normalizedBookings });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const approveBooking = async (req, res) => {
    try {
        const { bookingId } = req.params; // ✅ FIXED: Changed from req.body to req.params to match adminRoute.js
        const booking = await bookingModel.findByIdAndUpdate(bookingId, { status: 'approved' }, { new: true }).populate('userId');

        if (!booking) return res.json({ success: false, message: "Booking not found" });

        await createOrRefreshNotification({
            recipient: booking.userId._id,
            type: "booking_update",
            message: "Booking approved.",
            link: `/my-bookings?bookingId=${booking._id}`
        });

        await sendEmail(
            booking.userId.email,
            "Booking approved - Mercedarian Retreat House",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                <p>Hello ${booking.userId.firstName},</p>
                <p>Your booking has been approved.</p>
                <p>Booking: ${booking.bookingName || "Reservation"}</p>
                <p>Check-in: ${new Date(getBookingCheckInDate(booking)).toLocaleDateString()}</p>
                <p>You can view details in your account.</p>
                <p>Mercedarian Retreat House</p>
            </div>
            `
        );

        res.json({ success: true, message: "Booking Approved" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const declineBooking = async (req, res) => {
    try {
        const { bookingId } = req.params; // ✅ FIXED: Changed from req.body to req.params to match adminRoute.js
        const booking = await bookingModel.findByIdAndUpdate(bookingId, { status: 'declined' }, { new: true }).populate('userId');

        if (!booking) return res.json({ success: false, message: "Booking not found" });

        await sendEmail(
            booking.userId.email,
            "Booking update - Mercedarian Retreat House",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                <p>Hello ${booking.userId.firstName},</p>
                <p>Your booking request was declined.</p>
                <p>You can submit a new request or contact us if you need help.</p>
                <p>Mercedarian Retreat House</p>
            </div>
            `
        );

        res.json({ success: true, message: "Booking Declined" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const paymentConfirmed = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await bookingModel.findByIdAndUpdate(bookingId, { payment: true, paymentStatus: 'paid' }, { new: true }).populate('userId').populate('bookingItems.roomId')

        if (!booking) return res.json({ success: false, message: "Booking not found" });

        await sendEmail(
            booking.userId.email,
            "Payment confirmed - Mercedarian Retreat House",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                <p>Hello ${booking.userId.firstName},</p>
                <p>Your payment is confirmed.</p>
                <p>Booking: ${booking.bookingName || booking.bookingItems?.[0]?.roomId?.name || "Reservation"}</p>
                <p>Your reservation is secured.</p>
                <p>Mercedarian Retreat House</p>
            </div>
            `
        );

        await createOrRefreshNotification({
            recipient: booking.userId._id,
            type: "payment_update",
            message: `Payment confirmed for ${booking.bookingName || "your reservation"}.`,
            link: `/my-bookings?bookingId=${booking._id}`,
            isRead: false
        });

        res.json({ success: true, message: "Payment Confirmed" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ======================================================================
// 🛑 CANCELLATION & REFUNDS
// ======================================================================

const approveCancellationRequest = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await bookingModel.findByIdAndUpdate(bookingId, { status: 'cancelled' }, { new: true }).populate('userId');

        if (!booking) return res.json({ success: false, message: "Booking not found" });

        await sendEmail(
            booking.userId.email,
            "Cancellation approved - Mercedarian Retreat House",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                <p>Hello ${booking.userId.firstName},</p>
                <p>Your cancellation request was approved.</p>
                <p>Your booking is now cancelled.</p>
                <p>Mercedarian Retreat House</p>
            </div>
            `
        );

        res.json({ success: true, message: "Cancellation Approved" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const resolveCancellation = async (req, res) => {
    try {
        const { bookingId, action } = req.body; 
        const newStatus = action === 'approve' ? 'cancelled' : 'approved';
        
        const booking = await bookingModel.findByIdAndUpdate(bookingId, { status: newStatus }, { new: true }).populate('userId');

        if (!booking) return res.json({ success: false, message: "Booking not found" });

        await sendEmail(
            booking.userId.email,
            "Cancellation update - Mercedarian Retreat House",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                <p>Hello ${booking.userId.firstName},</p>
                <p>Your cancellation request was ${action === 'approve' ? 'approved' : 'declined'}.</p>
                ${action === 'approve' ? `<p>Your booking is now cancelled.</p>` : `<p>Your reservation remains active.</p>`}
                <p>Mercedarian Retreat House</p>
            </div>
            `
        );
        
        res.json({ success: true, message: `Cancellation request ${action}d.` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const checkExpiredCancellations = async (req, res) => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const result = await bookingModel.updateMany(
            { status: 'cancellation_pending', updatedAt: { $lt: twentyFourHoursAgo } },
            { $set: { status: 'cancelled' } }
        );
        res.json({ success: true, message: `Processed ${result.modifiedCount} expired requests.` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ======================================================================
// ⚙️ SETTINGS (BUILDINGS & ROOM TYPES)
// ======================================================================

const getBuildings = async (req, res) => {
    try {
        const buildings = await buildingModel.find({}).sort({ name: 1 });
        res.json({ success: true, buildings });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const addBuilding = async (req, res) => {
    try {
        const name = normalizeName(req.body.name);
        if (!name) return res.json({ success: false, message: "Name required" });
        
        const exists = await buildingModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (exists) return res.json({ success: false, message: "Building already exists" });

        const newBuilding = new buildingModel({ name });
        await newBuilding.save();
        res.json({ success: true, message: "Building Added" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const deleteBuilding = async (req, res) => {
    try {
        const { id } = req.body;
        const roomExists = await roomModel.exists({ buildingId: id });
        if (roomExists) {
            return res.json({
                success: false,
                message: "Building is linked to existing rooms and cannot be deleted"
            });
        }

        await buildingModel.findByIdAndDelete(id);
        res.json({ success: true, message: "Building Removed" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const updateBuilding = async (req, res) => {
    try {
        const { id } = req.body; 
        const name = normalizeName(req.body.name);

        if (!name) {
            return res.json({ success: false, message: "Name required" });
        }

        const duplicateBuilding = await buildingModel.findOne({
            _id: { $ne: id },
            name: { $regex: new RegExp(`^${name}$`, "i") }
        });

        if (duplicateBuilding) {
            return res.json({ success: false, message: "Building already exists" });
        }

        const buildingDoc = await buildingModel.findById(id);
        if (!buildingDoc) {
            return res.json({ success: false, message: "Building not found" });
        }

        buildingDoc.name = name;
        await buildingDoc.save();

        res.json({ success: true, message: "Building Updated" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const getRoomTypes = async (req, res) => {
    try {
        const types = await roomTypeModel.find({}).sort({ name: 1 });
        res.json({ success: true, types });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const addRoomType = async (req, res) => {
    try {
        const name = normalizeName(req.body.name);
        if (!name) return res.json({ success: false, message: "Name required" });

        const exists = await roomTypeModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (exists) return res.json({ success: false, message: "Room type already exists" });

        const newType = new roomTypeModel({ name });
        await newType.save();
        res.json({ success: true, message: "Room Type Added" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const deleteRoomType = async (req, res) => {
    try {
        const { id } = req.body;
        const [roomExists, packageExists] = await Promise.all([
            roomModel.exists({ roomTypeId: id }),
            packageModel.exists({ roomTypeId: id })
        ]);

        if (roomExists || packageExists) {
            return res.json({
                success: false,
                message: "Room type is linked to rooms or packages and cannot be deleted"
            });
        }

        await roomTypeModel.findByIdAndDelete(id);
        res.json({ success: true, message: "Room Type Removed" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const updateRoomType = async (req, res) => {
    try {
        const { id } = req.body;
        const name = normalizeName(req.body.name);

        if (!name) {
            return res.json({ success: false, message: "Name required" });
        }

        const duplicateRoomType = await roomTypeModel.findOne({
            _id: { $ne: id },
            name: { $regex: new RegExp(`^${name}$`, "i") }
        });

        if (duplicateRoomType) {
            return res.json({ success: false, message: "Room type already exists" });
        }

        const typeDoc = await roomTypeModel.findById(id);
        if (!typeDoc) {
            return res.json({ success: false, message: "Room Type not found" });
        }

        typeDoc.name = name;
        await typeDoc.save();

        res.json({ success: true, message: "Room Type Updated" });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ======================================================================
// 📤 EXPORTS
// ======================================================================

export {
    loginAdmin, 
    verifyAdminSession,
    adminDashboard, 
    getAllUsers, 
    getAllStaff, 
    addGuestUser,
    createStaff,
    updateStaff,
    changeUserStatus,       
    addRoom, 
    updateRoom,
    getAllRooms, 
    changeAvailability, 
    deleteRoom,
    allBookings,
    approveBooking,
    declineBooking,
    paymentConfirmed,
    approveCancellationRequest,
    checkExpiredCancellations,
    resolveCancellation,
    getBuildings, addBuilding, deleteBuilding, updateBuilding,
    getRoomTypes, addRoomType, deleteRoomType, updateRoomType
};


