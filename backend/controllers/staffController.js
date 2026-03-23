import userModel from "../models/userModel.js";
import bookingModel from "../models/bookingModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { admin, initFirebaseAdmin } from "../config/firebaseAdmin.js";
import validator from "validator";
import {
  attachReviewDataToBookings,
  buildBookingPopulate,
} from "../utils/dataConsistency.js";

const normalizePHPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  return digits;
};

const isValidPHPhone = (value) => /^09\d{9}$/.test(value);

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const verifyFirebasePhoneToken = async (idToken) => {
  if (!idToken) {
    throw new Error("Missing Firebase phone verification token");
  }

  initFirebaseAdmin();
  const decoded = await admin.auth().verifyIdToken(idToken);
  const signInProvider = decoded.firebase?.sign_in_provider;

  if (signInProvider && signInProvider !== "phone") {
    throw new Error("Invalid phone verification token");
  }

  const phoneNumber = decoded.phone_number;
  if (!phoneNumber) {
    throw new Error("Phone number not found in token");
  }

  const normalizedPhone = normalizePHPhone(phoneNumber);
  if (!isValidPHPhone(normalizedPhone)) {
    throw new Error("Invalid Philippine phone number");
  }

  return { decoded, normalizedPhone };
};

const parseStaffNamePayload = (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return { firstName: "", middleName: "", lastName: "", suffix: "" };
  }

  if (raw.includes("|")) {
    const [firstName = "", middleName = "", lastName = "", suffix = ""] = raw.split("|");
    return {
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      lastName: lastName.trim(),
      suffix: suffix.trim(),
    };
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], middleName: "", lastName: "", suffix: "" };
  }

  return {
    firstName: parts[0] || "",
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1] || "",
    suffix: "",
  };
};

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

/* =====================================================
   STAFF LOGIN (EMAIL OR PHONE)
===================================================== */
export const staffLogin = async (req, res) => {
  try {
    const { identifier, email, phone, password } = req.body;
    const rawIdentifier = String(identifier || email || phone || "").trim();
    const normalizedPhone = normalizePHPhone(rawIdentifier);
    const isEmail = validator.isEmail(rawIdentifier);
    const isPhone = isValidPHPhone(normalizedPhone);

    if (!rawIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter credentials",
      });
    }

    if (!isEmail && !isPhone) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email or 11-digit phone number",
      });
    }

    // 1. Find the user by email or phone
    const phoneCandidates = buildPhoneCandidates(rawIdentifier);
    const query = isEmail
      ? { email: rawIdentifier.toLowerCase() }
      : { phone: { $in: phoneCandidates } };

    const user = await userModel.findOne({
      ...query,
      role: "staff"
    });

    // 2. If user doesn't exist
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 3. CHECK DISABLED STATUS FIRST 🚨
    if (user.disabled) {
      return res.status(403).json({ 
        success: false,
        message: "Account Frozen: Please contact the administrator",
      });
    }

    // 4. Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // ✅ UPDATED: Added name to payload for Review Chat identification
    // This allows the middleware to verify identity and display the correct sender name
    const token = jwt.sign(
      { 
        id: user._id, 
        role: "staff",
        name: user.firstName ? `${user.firstName} ${user.lastName}` : user.name,
        tokenVersion: user.tokenVersion || 0 
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      token,
    });

  } catch (error) {
    console.error("Staff Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


/* =====================================================
   GET STAFF PROFILE
===================================================== */
export const getStaffProfile = async (req, res) => {
  try {
    const staffId = req.userId || req.user?.id; 
    const staff = await userModel.findById(staffId).select("-password");

    if (!staff || staff.role !== "staff") {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    return res.status(200).json({
      success: true,
      userData: staff,
    });

  } catch (error) {
    console.error("❌ getStaffProfile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load staff profile",
    });
  }
};

export const verifyStaffSession = async (req, res) => {
  return res.status(200).json({ success: true });
};

/* =====================================================
   UPDATE STAFF PROFILE
===================================================== */
export const updateStaffProfile = async (req, res) => {
  try {
    const {
      name,
      firstName,
      middleName,
      lastName,
      suffix,
      email,
      phone,
      phoneIdToken,
      oldPassword,
      newPassword,
      removeImage,
    } = req.body;

    const staffId = req.userId || req.user?.id;
    const staff = await userModel.findById(staffId);

    if (!staff || staff.role !== "staff") {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const parsedName = parseStaffNamePayload(name);
    const normalizedFirstName =
      typeof firstName === "string" ? firstName.trim() : parsedName.firstName || staff.firstName;
    const normalizedMiddleName =
      typeof middleName === "string"
        ? middleName.trim()
        : parsedName.middleName || staff.middleName || "";
    const normalizedLastName =
      typeof lastName === "string" ? lastName.trim() : parsedName.lastName || staff.lastName;
    const normalizedSuffix =
      typeof suffix === "string" ? suffix.trim() : parsedName.suffix || staff.suffix || "";
    const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : normalizeEmail(staff.email);
    const normalizedPhone = typeof phone === "string" ? normalizePHPhone(phone.trim()) : normalizePHPhone(staff.phone || "");
    const currentPhone = normalizePHPhone(staff.phone || "");
    const currentEmail = normalizeEmail(staff.email);

    if (!normalizedFirstName || !normalizedLastName) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required",
      });
    }

    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!isValidPHPhone(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    if (normalizedPhone !== currentPhone) {
      if (!phoneIdToken) {
        return res.status(400).json({
          success: false,
          message: "Please verify your phone number first",
        });
      }

      let verifiedPhone;
      try {
        verifiedPhone = await verifyFirebasePhoneToken(phoneIdToken);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message || "Please verify your phone number first",
        });
      }

      if (verifiedPhone.normalizedPhone !== normalizedPhone) {
        return res.status(400).json({
          success: false,
          message: "Verified phone number does not match the phone you entered",
        });
      }

      const phoneConflictUser = await userModel.findOne({
        phone: normalizedPhone,
        _id: { $ne: staff._id },
      });

      if (phoneConflictUser && phoneConflictUser.isVerified) {
        return res.status(400).json({
          success: false,
          message: "Phone number already taken",
        });
      }
    }

    if (normalizedEmail !== currentEmail) {
      const emailExists = await userModel.findOne({
        email: normalizedEmail,
        _id: { $ne: staff._id },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    staff.firstName = normalizedFirstName;
    staff.middleName = normalizedMiddleName;
    staff.lastName = normalizedLastName;
    staff.suffix = normalizedSuffix;
    staff.email = normalizedEmail;
    staff.phone = normalizedPhone;
    if (normalizedPhone !== currentPhone) {
      staff.phoneVerified = true;
      staff.pendingPhone = "";
    }

    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ success: false, message: "Current password is required" });
      }

      const isMatch = await bcrypt.compare(oldPassword, staff.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Old password is incorrect" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
      }
      const salt = await bcrypt.genSalt(10);
      staff.password = await bcrypt.hash(newPassword, salt);
      staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    }

    if (removeImage === "true" || removeImage === true) {
      staff.image = "";
    } else if (req.file) {
      const streamUpload = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "staff_profiles" },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          stream.end(fileBuffer);
        });
      };

      const uploadResult = await streamUpload(req.file.buffer);
      staff.image = uploadResult.secure_url;
    }

    await staff.save();
    const safeStaff = await userModel.findById(staffId).select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      userData: safeStaff,
    });

  } catch (error) {
    console.error("❌ updateStaffProfile error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

/* =====================================================
   VERIFY STAFF PHONE (FIREBASE OTP)
===================================================== */
export const verifyStaffPhoneFirebase = async (req, res) => {
  try {
    const staffId = req.userId || req.user?.id;
    const { idToken } = req.body;
    const { normalizedPhone } = await verifyFirebasePhoneToken(idToken);

    const conflictUser = await userModel.findOne({
      phone: normalizedPhone,
      _id: { $ne: staffId }
    });
    if (conflictUser && conflictUser.isVerified) {
      return res.json({ success: false, message: "Phone number already taken" });
    }

    return res.json({
      success: true,
      message: "Phone verified successfully",
      phone: normalizedPhone
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const checkStaffPhoneAvailability = async (req, res) => {
  try {
    const staffId = req.userId || req.user?.id;
    const { phone } = req.body;
    const phoneCandidates = buildPhoneCandidates(phone);
    const normalizedPhone = normalizePHPhone(phone);

    if (!phoneCandidates.length || !isValidPHPhone(normalizedPhone)) {
      return res.json({ success: true, exists: false });
    }

    const conflictUser = await userModel.findOne({
      phone: { $in: phoneCandidates },
      _id: { $ne: staffId }
    });

    return res.json({
      success: true,
      exists: Boolean(conflictUser && conflictUser.isVerified)
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

/* =====================================================
   GET STAFF BOOKINGS
===================================================== */
export const getStaffBookings = async (req, res) => {
  try {

    let bookingsQuery = bookingModel.find({}).sort({ createdAt: -1 });

    for (const populateConfig of buildBookingPopulate()) {
      bookingsQuery = bookingsQuery.populate(populateConfig);
    }

    const bookings = await bookingsQuery;
    const normalizedBookings = await attachReviewDataToBookings(bookings);

    return res.status(200).json({
      success: true,
      bookings: normalizedBookings
    });

  } catch (error) {
    console.error("❌ getStaffBookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load bookings"
    });
  }
};

/* =====================================================
   STAFF DASHBOARD STATS
===================================================== */
export const getStaffDashboardStats = async (req, res) => {
  try {
    const totalBookings = await bookingModel.countDocuments();
    const pendingBookings = await bookingModel.countDocuments({ status: "pending" });
    const approvedBookings = await bookingModel.countDocuments({ status: "approved" });
    const users = await userModel.countDocuments({ role: { $ne: "admin" } });

    return res.status(200).json({
      success: true,
      stats: {
        totalBookings,
        pendingBookings,
        approvedBookings,
        users
      },
    });

  } catch (error) {
    console.error("❌ getStaffDashboardStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard stats",
    });
  }
};
