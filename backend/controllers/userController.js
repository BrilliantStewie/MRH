import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";
import axios from "axios"; 
import userModel from "../models/userModel.js";
import bookingModel from "../models/bookingModel.js";
import Review from "../models/reviewModel.js";
import cloudinary from "../config/cloudinary.js"; 
import { admin, initFirebaseAdmin } from "../config/firebaseAdmin.js";
import sendEmail from "../utils/sendEmail.js";
import sendSMS from "../utils/sendSMS.js";
import {
    createOrRefreshNotification,
    createOrRefreshNotifications,
} from "../utils/notificationUtils.js";
import {
    attachReviewDataToBookings,
    buildBookingPopulate,
    packageReferencePopulate,
    roomReferencePopulate,
    serializeReview,
} from "../utils/dataConsistency.js";
import {
    BOOKING_DATE_SELECT,
    getBookingCheckInDate,
} from "../utils/bookingDateFields.js";
import { createValidatedBooking } from "../utils/bookingService.js";
import { getBookingReviewEligibility } from "../utils/bookingRules.js";
import {
    hasClaimedEmail,
    hasClaimedPhone,
    hasVerifiedEmail,
} from "../utils/userVerification.js";
import {
    buildSessionTokenPayload,
    bumpSessionVersion,
    getSessionVersion,
} from "../utils/sessionVersion.js";

// --- HELPERS ---
const parseGoogleDisplayName = (value, fallbackFirst = "") => {
    const cleaned = String(value || "").trim().replace(/\s+/g, " ");
    if (!cleaned) {
        return { firstName: fallbackFirst || "Google", middleName: "", lastName: "" };
    }
    const parts = cleaned.split(" ");
    if (parts.length === 1) {
        return { firstName: cleaned, middleName: "", lastName: "" };
    }
    return {
        firstName: parts.slice(0, -1).join(" "),
        middleName: "",
        lastName: parts[parts.length - 1]
    };
};

const createToken = (id, name, role, sessionVersion = 0) => {
    return jwt.sign(
        buildSessionTokenPayload({ id, name, role, sessionVersion }),
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );
};

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

const streamUpload = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: "image" },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );
        stream.end(fileBuffer);
    });
};

const ensureEmailSent = async (...args) => {
    const result = await sendEmail(...args);

    if (!result?.success) {
        throw new Error(result?.message || "Unable to send email right now.");
    }

    return result;
};

// --- AUTHENTICATION ---

// ✅ Send OTP for Email Verification or Password Reset
const sendOTP = async (req, res) => {
    try {
        const { email, isResetMode } = req.body;

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Invalid email" });
        }

        let user = await userModel.findOne({ email: email.toLowerCase().trim() });

        // ✅ PREVENT SENDING OTP IF EMAIL IS ALREADY TAKEN BY A VERIFIED USER (except for reset)
        if (!isResetMode && hasClaimedEmail(user)) {
            return res.json({ success: false, message: "Email already taken" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        if (user) {
            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();
        } else {
            const salt = await bcrypt.genSalt(10);
            const dummyPassword = await bcrypt.hash(Math.random().toString(36), salt);
            
            user = new userModel({
                email,
                otp,
                otpExpires,
                firstName: "Pending",
                lastName: "Verification",
                password: dummyPassword,
                passwordSet: false,
                phone: null,
                emailVerified: false
            });
            await user.save();
        }

        await ensureEmailSent(
            email,
            "Your verification code",
            `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                    <p>Use this code to continue:</p>
                    <p style="font-size: 20px; font-weight: 700; letter-spacing: 2px;">${otp}</p>
                    <p>This code expires in 10 minutes.</p>
                    <p>If you did not request this, you can ignore this email.</p>
                    <p>Mercedarian Retreat House</p>
                </div>
            `
        );

        res.json({ success: true, message: "OTP sent to your email" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// ✅ Send OTP via Phone (Registration/Login)
const sendPhoneOTP = async (req, res) => {
    try {
        const { phone, isResetMode } = req.body;

        const normalizedPhone = normalizePHPhone(phone);
        if (!normalizedPhone || normalizedPhone.length < 11 || !isValidPHPhone(normalizedPhone)) {
            return res.json({ success: false, message: "Invalid phone number" });
        }

        let user = await userModel.findOne({ phone: normalizedPhone.trim() });

        // ✅ PREVENT SENDING OTP IF PHONE IS ALREADY TAKEN BY A VERIFIED USER (except for reset)
        if (!isResetMode && hasClaimedPhone(user)) {
            return res.json({ success: false, message: "Phone number already taken" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        if (user) {
            user.otp = otp;
            user.otpExpires = otpExpires;
            await user.save();
        } else {
            const salt = await bcrypt.genSalt(10);
            const dummyPassword = await bcrypt.hash(Math.random().toString(36), salt);

            user = new userModel({
                phone: normalizedPhone,
                email: `phone_${Date.now()}_${phone}@mrh.local`,
                otp,
                otpExpires,
                firstName: "Pending",
                lastName: "Phone User",
                password: dummyPassword
            });

            await user.save();
        }

        // ✅ ACTUAL SMS SENDING
        await sendSMS(
            normalizedPhone,
            `Your MRH verification code is: ${otp}. Valid for 10 minutes.`
        );

        res.json({ success: true, message: "OTP sent to your phone" });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ✅ Handle Password Reset Request (Email)
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userModel.findOne({ 
    email: email.toLowerCase().trim() 
});

        if (!user) {
            return res.json({ success: false, message: "No account found with this email" });
        }

        req.body.isResetMode = true;
        return sendOTP(req, res);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const sendEmailChangeOTP = async (req, res) => {
    try {
        const userId = req.userId;
        const normalizedEmail = normalizeEmail(req.body.email);

        if (!validator.isEmail(normalizedEmail)) {
            return res.json({ success: false, message: "Invalid email" });
        }

        const user = await userModel.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found" });

        const currentEmail = normalizeEmail(user.email);
        if (normalizedEmail === currentEmail) {
            return res.json({ success: false, message: "Please enter a different email address" });
        }

        const existingUser = await userModel.findOne({
            email: normalizedEmail,
            _id: { $ne: userId }
        });

        if (existingUser) {
            return res.json({ success: false, message: "Email already taken" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        user.pendingEmail = normalizedEmail;
        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        await ensureEmailSent(
            normalizedEmail,
            "Confirm your new email address",
            `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                    <p>Use this code to confirm your new email address:</p>
                    <p style="font-size: 20px; font-weight: 700; letter-spacing: 2px;">${otp}</p>
                    <p>This code expires in 10 minutes.</p>
                    <p>If you did not request this change, you can ignore this email.</p>
                    <p>Mercedarian Retreat House</p>
                </div>
            `
        );

        res.json({ success: true, message: "OTP sent to your new email address" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ✅ Handle Password Reset Request (Phone)
const requestPhoneReset = async (req, res) => {
    try {
        const { phone } = req.body;
        const normalizedPhone = normalizePHPhone(phone);

        if (!isValidPHPhone(normalizedPhone)) {
            return res.json({ success: false, message: "Invalid phone number" });
        }

        const user = await userModel.findOne({
            phone: { $in: buildPhoneCandidates(normalizedPhone) }
        });

        if (!user) {
            return res.json({ success: false, message: "No account found with this phone number" });
        }

        return res.json({ success: true, message: "Phone account found" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const sendPhoneOTPUpdate = async (req, res) => {
    try {
        const userId = req.userId;
        const { phone } = req.body;
        const normalizedPhone = normalizePHPhone(phone);

        if (!normalizedPhone || !isValidPHPhone(normalizedPhone)) {
            return res.json({ success: false, message: "Invalid phone number" });
        }

        const conflictUser = await userModel.findOne({
            phone: normalizedPhone,
            _id: { $ne: userId }
        });
        if (hasClaimedPhone(conflictUser)) {
            return res.json({ success: false, message: "Phone number already taken" });
        }

        const user = await userModel.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000;

        user.otp = otp;
        user.otpExpires = otpExpires;
        user.pendingPhone = normalizedPhone;
        await user.save();

        await sendSMS(
            normalizedPhone,
            `Your MRH verification code is: ${otp}. Valid for 10 minutes.`
        );

        res.json({ success: true, message: "OTP sent to your phone" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const verifyPhoneFirebase = async (req, res) => {
    try {
        const { idToken } = req.body;
        const { normalizedPhone } = await verifyFirebasePhoneToken(idToken);
        const userId = req.userId;
        const conflictUser = await userModel.findOne({
            phone: normalizedPhone,
            _id: { $ne: userId }
        });
        if (hasClaimedPhone(conflictUser)) {
            return res.json({ success: false, message: "Phone number already taken" });
        }

        res.json({ success: true, message: "Phone verified successfully", phone: normalizedPhone });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const verifyPhoneOTPUpdate = async (req, res) => {
    try {
        const userId = req.userId;
        const { otp } = req.body;
        const user = await userModel.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found" });

        const storedOtp = user.otp ? String(user.otp).trim() : null;
        const providedOtp = otp ? String(otp).trim() : null;

        if (!storedOtp || storedOtp !== providedOtp) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        if (new Date() > new Date(user.otpExpires)) {
            return res.json({ success: false, message: "OTP expired" });
        }

        if (!user.pendingPhone) {
            return res.json({ success: false, message: "No pending phone to verify" });
        }

        user.phone = user.pendingPhone;
        user.pendingPhone = "";
        user.phoneVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        res.json({ success: true, message: "Phone verified successfully" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { otp, newPassword, phoneIdToken } = req.body;
        const rawIdentifier = String(req.body.identifier || req.body.email || req.body.phone || "").trim();
        const normalizedPhone = normalizePHPhone(rawIdentifier);
        const isEmail = validator.isEmail(rawIdentifier);
        const isPhone = isValidPHPhone(normalizedPhone);

        if (!isEmail && !isPhone) {
            return res.json({ success: false, message: "Invalid email or phone number" });
        }

        const user = await userModel.findOne(
            isEmail
                ? { email: rawIdentifier.toLowerCase().trim() }
                : { phone: { $in: buildPhoneCandidates(normalizedPhone) } }
        );

        if (!user) return res.json({ success: false, message: "User not found" });

        if (isPhone) {
            let verifiedPhone;
            try {
                verifiedPhone = await verifyFirebasePhoneToken(phoneIdToken);
            } catch (error) {
                return res.json({ success: false, message: error.message || "Invalid phone verification token" });
            }

            if (verifiedPhone.normalizedPhone !== normalizedPhone) {
                return res.json({ success: false, message: "Verified phone number does not match the selected account" });
            }
        } else {
            const storedOtp = user.otp ? String(user.otp).trim() : null;
            const providedOtp = otp ? String(otp).trim() : null;

            if (!storedOtp || storedOtp !== providedOtp) {
                return res.json({ success: false, message: "Invalid reset code" });
            }

            if (new Date() > new Date(user.otpExpires)) {
                return res.json({ success: false, message: "Code has expired" });
            }
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.passwordSet = true;
        bumpSessionVersion(user);
        if (isPhone) {
            user.phoneVerified = true;
        }
        
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        await sendEmail(
            user.email,
            "Password updated - Mercedarian Retreat House",
            `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                    <p>Hello ${user.firstName},</p>
                    <p>Your password was updated.</p>
                    <p>If you did not make this change, please contact us.</p>
                    <p>Mercedarian Retreat House</p>
                </div>
            `
        );

        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const googleAuth = async (req, res) => {
    try {
        const { idToken, intent } = req.body;
        if (!idToken) {
            return res.json({ success: false, message: "Missing Google token." });
        }
        const normalizedIntent = intent === "signup" ? "signup" : "login";

        initFirebaseAdmin();
        const decoded = await admin.auth().verifyIdToken(idToken);

        const email = (decoded.email || "").toLowerCase().trim();
        if (!email) {
            return res.json({ success: false, message: "Google account has no email." });
        }

        const displayName = decoded.name || "";
        const givenName = decoded.given_name || "";
        const familyName = decoded.family_name || "";
        const photoURL = decoded.picture || "";
        const emailVerified = decoded.email_verified === true;
        const fullName = (displayName || [givenName, familyName].filter(Boolean).join(" ") || email.split("@")[0]).trim();

        let user = await userModel.findOne({ email });

        if (user) {
            if (user.disabled) {
                return res.json({ success: false, message: "Account disabled. Contact admin." });
            }
            if (normalizedIntent === "signup") {
                if (user.authProvider === "google") {
                    return res.json({ success: false, message: "Account already exists. Please log in with Google." });
                }
                return res.json({ success: false, message: "Email already registered. Please log in with your password." });
            }
            if (normalizedIntent === "login" && user.authProvider === "local") {
                return res.json({ success: false, message: "This account uses email and password. Please log in with your password." });
            }
            let updated = false;
            const shouldRefreshName = Boolean(fullName);
            const isLegacyGoogleUser = user.lastName === "User";

            if (user.authProvider === "google" || isLegacyGoogleUser) {
                if (user.authProvider !== "google") {
                    user.authProvider = "google";
                    updated = true;
                }

                if (shouldRefreshName) {
                    const parsedName = parseGoogleDisplayName(fullName, user.firstName);
                    if (parsedName.firstName && user.firstName !== parsedName.firstName) {
                        user.firstName = parsedName.firstName;
                        updated = true;
                    }

                    if (user.middleName !== parsedName.middleName) {
                        user.middleName = parsedName.middleName;
                        updated = true;
                    }

                    if (user.lastName !== parsedName.lastName) {
                        user.lastName = parsedName.lastName;
                        updated = true;
                    }
                }
            }
            if (photoURL && !user.image) {
                user.image = photoURL;
                updated = true;
            }
            if (emailVerified && user.emailVerified !== true) {
                user.emailVerified = true;
                updated = true;
            }
            if (updated) await user.save();
        } else {
            if (normalizedIntent === "login") {
                return res.json({ success: false, message: "No account found. Please sign up with Google." });
            }
            if (!emailVerified) {
                return res.json({ success: false, message: "Google account email is not verified." });
            }
            const parsedName = parseGoogleDisplayName(fullName, "Google");
            const firstName = parsedName.firstName || "Google";
            const middleName = parsedName.middleName;
            const lastName = parsedName.lastName;

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(Math.random().toString(36), salt);

            user = new userModel({
                firstName,
                middleName,
                lastName,
                email,
                image: photoURL,
                password: hashedPassword,
                passwordSet: false,
                phone: null,
                emailVerified: true,
                authProvider: "google"
            });
            await user.save();

            await sendEmail(
                email,
                "Welcome to Mercedarian Retreat House",
                `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                        <p>Hello ${firstName},</p>
                        <p>Your account is ready. You can sign in and book your stay.</p>
                        <p>Mercedarian Retreat House</p>
                    </div>
                `
            );
        }

        const token = createToken(user._id, `${user.firstName} ${user.lastName}`, user.role, getSessionVersion(user));
        res.json({ success: true, token });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const registerUser = async (req, res) => {
    try {
        const { firstName, middleName, lastName, suffix, email, password, phone, phoneIdToken } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = normalizePHPhone(phone);

        if (!firstName || !lastName || !normalizedEmail || !password || !normalizedPhone) {
            return res.json({ success: false, message: "Missing details" });
        }

        if (!validator.isEmail(normalizedEmail)) {
            return res.json({ success: false, message: "Invalid email" });
        }

        if (!isValidPHPhone(normalizedPhone)) {
            return res.json({ success: false, message: "Invalid phone number" });
        }

        let verifiedPhone;
        try {
            verifiedPhone = await verifyFirebasePhoneToken(phoneIdToken);
        } catch (error) {
            return res.json({ success: false, message: error.message || "Please verify your phone number first" });
        }

        if (verifiedPhone.normalizedPhone !== normalizedPhone) {
            return res.json({ success: false, message: "Verified phone number does not match the submitted number" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const existingUser = await userModel.findOne({ email: normalizedEmail });
        const phoneConflictUser = await userModel.findOne({
            phone: { $in: buildPhoneCandidates(normalizedPhone) },
            ...(existingUser ? { _id: { $ne: existingUser._id } } : {})
        });

        if (phoneConflictUser) {
            const isDisposablePlaceholder =
                !hasClaimedPhone(phoneConflictUser) &&
                phoneConflictUser.firstName === "Pending" &&
                /@mrh\.local$/i.test(String(phoneConflictUser.email || ""));

            if (isDisposablePlaceholder) {
                await userModel.findByIdAndDelete(phoneConflictUser._id);
            } else {
                return res.json({ success: false, message: "Phone number already taken" });
            }
        }

        if (!existingUser) {
            return res.json({ success: false, message: "Please verify your email first" });
        }

        if (existingUser.firstName !== "Pending") {
            if (hasVerifiedEmail(existingUser)) {
                return res.json({ success: false, message: "User already exists" });
            }
            return res.json({ success: false, message: "Please verify your email first" });
        }

        if (!hasVerifiedEmail(existingUser)) {
            return res.json({ success: false, message: "Please verify your email first" });
        }

        existingUser.firstName = firstName;
        existingUser.middleName = middleName || "";
        existingUser.lastName = lastName;
        existingUser.suffix = suffix || "";
        existingUser.password = hashedPassword;
        existingUser.passwordSet = true;
        existingUser.email = normalizedEmail;
        existingUser.emailVerified = true;
        existingUser.phone = normalizedPhone;
        existingUser.phoneVerified = true;
        existingUser.pendingPhone = "";
        existingUser.otp = null;
        existingUser.otpExpires = null;
        await existingUser.save();

        await sendEmail(
            normalizedEmail,
            "Welcome to Mercedarian Retreat House",
            `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                    <p>Hello ${firstName},</p>
                    <p>Your account is active. You can now book your stay.</p>
                    <p>Mercedarian Retreat House</p>
                </div>
            `
        );

        res.json({ success: true, message: "Account created successfully" });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, identifier, phone, password } = req.body;
        const rawIdentifier = String(email || identifier || phone || "").trim();
        const normalizedPhone = normalizePHPhone(rawIdentifier);
        const isEmail = validator.isEmail(rawIdentifier);
        const isPhone = isValidPHPhone(normalizedPhone);

        if (!isEmail && !isPhone) {
            return res.json({ success: false, message: "Enter a valid email or 11-digit phone number" });
        }

        const phoneCandidates = buildPhoneCandidates(rawIdentifier);
        const query = isEmail
            ? { email: rawIdentifier.toLowerCase() }
            : { phone: { $in: phoneCandidates } };

        const user = await userModel.findOne(query);

        if (!user) return res.json({ success: false, message: "User does not exist" });
        if (user.disabled) return res.json({ success: false, message: "Account disabled. Contact admin." });
        if (!hasVerifiedEmail(user)) return res.json({ success: false, message: "Please verify your email first." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            const token = createToken(user._id, `${user.firstName} ${user.lastName}`, user.role, getSessionVersion(user));
            res.json({ success: true, token });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp, isResetMode } = req.body; 
    const user = await userModel.findOne({ email: email.toLowerCase().trim() });

    if (!user) return res.json({ success: false, message: "No verification request found" }); 

    if (!user.otp || String(user.otp) !== String(otp).trim()) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (new Date() > new Date(user.otpExpires)) {
      return res.json({ success: false, message: "OTP expired" });
    }

    user.emailVerified = true;

    if (!isResetMode) {
        user.otp = null;
        user.otpExpires = null;
    }
    
    await user.save();
    return res.json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const verifyPhoneOTP = async (req, res) => {
  try {
    const normalizedPhone = normalizePHPhone(req.body.phone);
    const { otp, isResetMode } = req.body;

    if (!isValidPHPhone(normalizedPhone)) {
      return res.json({ success: false, message: "Invalid phone number" });
    }

    const user = await userModel.findOne({
      phone: { $in: buildPhoneCandidates(normalizedPhone) }
    });

    if (!user) return res.json({ success: false, message: "No verification request found" });

    if (!user.otp || String(user.otp) !== String(otp).trim()) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (new Date() > new Date(user.otpExpires)) {
      return res.json({ success: false, message: "OTP expired" });
    }

    user.phoneVerified = true;

    if (!isResetMode) {
      user.otp = null;
      user.otpExpires = null;
    }

    await user.save();
    return res.json({ success: true, message: "Phone OTP verified successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

const verifyEmailChangeOTP = async (req, res) => {
    try {
        const userId = req.userId;
        const providedOtp = String(req.body.otp || "").trim();

        const user = await userModel.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found" });

        if (!user.pendingEmail) {
            return res.json({ success: false, message: "No email change request found" });
        }

        if (!user.otp || String(user.otp).trim() !== providedOtp) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        if (new Date() > new Date(user.otpExpires)) {
            return res.json({ success: false, message: "OTP expired" });
        }

        const existingUser = await userModel.findOne({
            email: user.pendingEmail,
            _id: { $ne: userId }
        });

        if (existingUser) {
            return res.json({ success: false, message: "Email already taken" });
        }

        user.email = user.pendingEmail;
        user.emailVerified = true;
        user.pendingEmail = "";
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        return res.json({
            success: true,
            message: "Email updated successfully",
            email: user.email
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

const getUserData = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId; 
        const userData = await userModel.findById(userId).select("-password");
        res.json({ success: true, userData });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId;
        const { firstName, middleName, lastName, suffix, phone, email, oldPassword, newPassword, removeImage, phoneIdToken } = req.body;

        const user = await userModel.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found" });

        const normalizedFirstName = typeof firstName === "string" ? firstName.trim() : user.firstName;
        const normalizedLastName = typeof lastName === "string" ? lastName.trim() : user.lastName;
        const normalizedMiddleName = typeof middleName === "string" ? middleName.trim() : middleName;
        const normalizedSuffix = typeof suffix === "string" ? suffix.trim() : suffix;
        const normalizedPhone = typeof phone === "string" ? phone.trim() : phone;
        const normalizedEmail = typeof email === "string" ? normalizeEmail(email) : normalizeEmail(user.email);
        const currentEmail = normalizeEmail(user.email);
        const isGoogleUser = user.authProvider === "google";

        if (!normalizedFirstName || !normalizedLastName) {
            return res.json({ success: false, message: "First name and last name are required" });
        }

        if (!validator.isEmail(normalizedEmail)) {
            return res.json({ success: false, message: "Invalid email" });
        }

        if (normalizedEmail !== currentEmail) {
            return res.json({ success: false, message: "Please verify your new email address first" });
        }

        if (!normalizedPhone && !isGoogleUser) {
            return res.json({ success: false, message: "Phone number is required" });
        }

        if (normalizedPhone && !isValidPHPhone(normalizedPhone)) {
            return res.json({ success: false, message: "Invalid phone number" });
        }

        const currentPhone = normalizePHPhone(user.phone || "");
        if (normalizedPhone && normalizedPhone !== currentPhone) {
            if (!phoneIdToken) {
                return res.json({ success: false, message: "Please verify your phone number first" });
            }

            let verifiedPhone;
            try {
                verifiedPhone = await verifyFirebasePhoneToken(phoneIdToken);
            } catch (error) {
                return res.json({ success: false, message: error.message || "Please verify your phone number first" });
            }

            if (verifiedPhone.normalizedPhone !== normalizedPhone) {
                return res.json({ success: false, message: "Verified phone number does not match the phone you entered" });
            }

            const phoneConflictUser = await userModel.findOne({
                phone: normalizedPhone,
                _id: { $ne: userId }
            });

            if (hasClaimedPhone(phoneConflictUser)) {
                return res.json({ success: false, message: "Phone number already taken" });
            }
        }

        user.firstName = normalizedFirstName;
        user.lastName = normalizedLastName;
        user.email = normalizedEmail;
        if (typeof normalizedSuffix !== "undefined") user.suffix = normalizedSuffix;
        if (typeof normalizedMiddleName !== 'undefined') user.middleName = normalizedMiddleName;
        user.phone = normalizedPhone || null;
        if (!normalizedPhone) {
            user.phoneVerified = false;
            user.pendingPhone = "";
        } else if (normalizedPhone !== currentPhone) {
            user.phoneVerified = true;
            user.pendingPhone = "";
        }

        if (newPassword) {
            const canSetPasswordWithoutCurrent = user.authProvider === "google" && user.passwordSet !== true;
            if (!canSetPasswordWithoutCurrent) {
                if (!oldPassword) return res.json({ success: false, message: "Current password is required" });
                const isMatch = await bcrypt.compare(oldPassword, user.password);
                if (!isMatch) return res.json({ success: false, message: "Current password is incorrect" });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            user.passwordSet = true;
            bumpSessionVersion(user);
        }

        if (removeImage === 'true' || removeImage === true) user.image = "";
        if (req.file) {
            const result = await streamUpload(req.file.buffer);
            user.image = result.secure_url;
        }

        await user.save();
        res.json({ success: true, message: "Profile updated successfully", userData: user });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// --- BOOKING LOGIC ---

const createBooking = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId;
        const {
            roomId,
            packageId,
            checkInDate,
            checkOutDate,
            checkIn,
            checkOut,
            participants,
            bookingName,
        } = req.body;

        const newBooking = await createValidatedBooking({
            userId,
            bookingName: bookingName || "Room Booking",
            bookingItems: roomId && packageId ? [{
                roomId,
                packageId,
                participants: Number(participants) || 1
            }] : [],
            extraPackages: [],
            venueParticipants: 0,
            checkInDate: checkInDate || checkIn,
            checkOutDate: checkOutDate || checkOut
        });

        const user = await userModel.findById(userId);
        if (user) {
            await sendEmail(
                user.email,
                "Booking request received - Mercedarian Retreat House",
                `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                        <p>Hello ${user.firstName},</p>
                        <p>Your booking request was received.</p>
                        <p>Check-in: ${new Date(getBookingCheckInDate(newBooking)).toLocaleDateString()}</p>
                        <p>Total: PHP ${newBooking.totalPrice}</p>
                        <p>Status: Pending approval</p>
                        <p>Mercedarian Retreat House</p>
                    </div>
                `
            );
        }

        res.json({ success: true, message: "Booking Created" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const getUserBookings = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId;
        let bookingsQuery = bookingModel.find({ userId }).sort({ createdAt: -1 });

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

const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await bookingModel.findById(bookingId).populate("userId");

        if (!booking) return res.json({ success: false, message: "Booking not found" });

        if (String(booking.userId?._id || booking.userId) !== String(req.userId)) {
            return res.json({ success: false, message: "Unauthorized booking access" });
        }

        const isApproved = booking.status === 'approved';
        const isPaid = booking.payment === true || booking.paymentStatus === 'paid';

        if (isApproved || isPaid) {
            await bookingModel.findByIdAndUpdate(bookingId, { status: "cancellation_pending" });
            await notifyAdminsAndStaff({
                type: "booking_update",
                message: `Cancellation request received: ${booking.bookingName || "Booking"}`,
                link: `/admin/bookings?bookingId=${booking._id}`,
                sender: booking.userId?._id || booking.userId
            });
            res.json({ success: true, message: "Cancellation request sent for approval" });
        } else {
            await bookingModel.findByIdAndUpdate(bookingId, { status: "cancelled" });
            
            await sendEmail(
                booking.userId.email,
                "Booking cancelled - Mercedarian Retreat House",
                `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                        <p>Hello ${booking.userId.firstName || "Guest"},</p>
                        <p>Your booking was cancelled.</p>
                        <p>Check-in: ${new Date(getBookingCheckInDate(booking)).toLocaleDateString()}</p>
                        <p>Mercedarian Retreat House</p>
                    </div>
                `
            );

            res.json({ success: true, message: "Booking Cancelled" });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// --- PAYMENT LOGIC ---

const createCheckoutSession = async (req, res) => {
    try {
        if (!process.env.PAYMONGO_SECRET_KEY || !process.env.FRONTEND_URL) {
            return res.json({ success: false, message: "Payment configuration missing." });
        }
        const { bookingId } = req.body;
        const booking = await bookingModel
            .findById(bookingId)
            .populate("bookingItems.roomId")
            .populate("bookingItems.packageId")
            .populate("extraPackages")
            .populate("userId", "firstName middleName lastName suffix email");
        if (!booking) return res.json({ success: false, message: "Booking not found" });

        if (String(booking.userId?._id || booking.userId) !== String(req.userId)) {
            return res.json({ success: false, message: "Unauthorized booking access" });
        }

        if (booking.paymentStatus === "paid") {
            return res.json({ success: false, message: "Booking is already marked as paid." });
        }

        const roomName = booking.bookingItems?.[0]?.roomId?.name;
        const packageName =
            booking.bookingItems?.[0]?.packageId?.name ||
            booking.extraPackages?.[0]?.name;
        const itemName = roomName || packageName || booking.bookingName || "Reservation";

        const user = booking.userId;
        const customerName = user
            ? [user.firstName, user.middleName, user.lastName, user.suffix].filter(Boolean).join(" ")
            : "Guest";
        const customerEmail = user?.email || "guest@example.com";

        const payload = {
            data: {
                attributes: {
                    send_email_receipt: true,
                    show_description: true,
                    show_line_items: true,
                    billing: {
                        name: customerName,
                        email: customerEmail
                    },
                    description: "Your receipt from Mercedarian Retreat House",
                    line_items: [{
                        currency: 'PHP',
                        amount: booking.totalPrice * 100,
                        description: `Booking for ${itemName}`,
                        name: "Mercedarian Retreat House",
                        quantity: 1
                    }],
                    payment_method_types: ['gcash'],
                    reference_number: booking._id.toString(),
                    success_url: `${process.env.FRONTEND_URL}/my-bookings?success=true&bookingId=${bookingId}`,
                    cancel_url: `${process.env.FRONTEND_URL}/my-bookings?canceled=true`
                }
            }
        };

        const response = await axios.post('https://api.paymongo.com/v1/checkout_sessions', payload, {
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY).toString('base64')}`
            }
        });

        try {
            await bookingModel.findByIdAndUpdate(bookingId, {
                paymentMethod: 'gcash',
                paymentStatus: 'pending'
            });
        } catch (updateError) {
            console.error("Failed to update booking payment method:", updateError.message);
        }

        res.json({ success: true, checkoutUrl: response.data.data.attributes.checkout_url });
    } catch (error) {
        const paymongoDetail = error.response?.data?.errors?.[0]?.detail;
        console.error("PayMongo checkout error:", error.response?.data || error.message);
        res.json({
            success: false,
            message: paymongoDetail || error.response?.data?.message || error.message || "Payment initialization failed"
        });
    }
};

const notifyAdminsAndStaff = async ({ type, message, link, sender }) => {
    try {
        const recipients = await userModel
            .find({ role: { $in: ["admin", "staff"] } })
            .select("_id");

        if (!recipients.length) return;

        const notifications = recipients.map((recipient) => ({
            recipient: recipient._id,
            sender,
            type,
            message,
            link,
            isRead: false
        }));

        await createOrRefreshNotifications(notifications);
    } catch (error) {
        console.error("Notification create error:", error.message);
    }
};

const notifyUser = async ({ recipient, type, message, link, sender }) => {
    if (!recipient) return;
    try {
        await createOrRefreshNotification({
            recipient,
            sender,
            type,
            message,
            link,
            isRead: false
        });
    } catch (error) {
        console.error("User notification create error:", error.message);
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await bookingModel.findById(bookingId).populate("userId");

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        if (String(booking.userId?._id || booking.userId) !== String(req.userId)) {
            return res.json({ success: false, message: "Unauthorized booking access" });
        }

        if (booking.paymentStatus === "paid") {
            return res.json({ success: true, message: "Payment already confirmed." });
        }

        if (booking.paymentMethod !== "gcash" || booking.paymentStatus !== "pending") {
            return res.json({ success: false, message: "GCash checkout is not in a verifiable state." });
        }

        await notifyAdminsAndStaff({
            type: "payment_update",
            message: `GCash payment submitted: ${booking.bookingName || "Booking"}`,
            link: `/admin/bookings?bookingId=${booking._id}`,
            sender: booking.userId?._id || booking.userId
        });

        await notifyUser({
            recipient: booking.userId?._id || booking.userId,
            type: "payment_update",
            message: "Payment submitted successfully. Awaiting admin confirmation.",
            link: `/my-bookings?bookingId=${booking._id}`
        });

        res.json({ success: true, message: "Payment submitted. Awaiting admin confirmation." });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const markCashPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await bookingModel.findById(bookingId).populate("userId");

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        if (String(booking.userId?._id || booking.userId) !== String(req.userId)) {
            return res.json({ success: false, message: "Unauthorized booking access" });
        }

        if (booking.paymentStatus === "paid") {
            return res.json({ success: false, message: "Booking is already marked as paid." });
        }

        await bookingModel.findByIdAndUpdate(bookingId, { 
            paymentMethod: 'cash',
            paymentStatus: 'pending'
        });

        await notifyAdminsAndStaff({
            type: "payment_update",
            message: `Cash payment selected: ${booking.bookingName || "Booking"}`,
            link: `/admin/bookings?bookingId=${booking._id}`,
            sender: booking.userId?._id || booking.userId
        });

        await notifyUser({
            recipient: booking.userId?._id || booking.userId,
            type: "payment_update",
            message: "Cash payment selected. Please pay at the counter.",
            link: `/my-bookings?bookingId=${booking._id}`
        });

        res.json({ success: true, message: "Marked as Pay Now (Cash)" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const confirmCashPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await bookingModel.findByIdAndUpdate(bookingId, { 
            payment: true,
            paymentStatus: 'paid' 
        }, { new: true }).populate("userId");

        if (booking) {
            await sendEmail(
                booking.userId.email,
                "Payment confirmed - Mercedarian Retreat House",
                `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
                        <p>Hello ${booking.userId.firstName},</p>
                        <p>Your cash payment was confirmed.</p>
                        <p>Your booking is now secured.</p>
                        <p>Mercedarian Retreat House</p>
                    </div>
                `
            );

            await notifyUser({
                recipient: booking.userId?._id || booking.userId,
                type: "payment_update",
                message: "Cash payment confirmed. Your reservation is secured.",
                link: `/my-bookings?bookingId=${booking._id}`
            });
        }

        res.json({ success: true, message: "Payment Confirmed by Admin" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// --- REVIEWS & CHAT LOGIC ---

const rateBooking = async (req, res) => {
    try {
        const { bookingId, rating, review } = req.body;
        const userId = req.userId;
        const booking = await bookingModel.findById(bookingId);
        const normalizedRating = Number(rating);
        const normalizedComment = String(review || "").trim();

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        if (String(booking.userId) !== String(userId)) {
            return res.json({ success: false, message: "Unauthorized booking access" });
        }

        const reviewEligibility = getBookingReviewEligibility(booking);
        if (!reviewEligibility.eligible) {
            return res.json({ success: false, message: reviewEligibility.message });
        }

        if (!normalizedRating || normalizedRating < 1 || normalizedRating > 5) {
            return res.json({ success: false, message: "Please provide a rating between 1 and 5" });
        }

        const existingReview = await Review.findOne({ bookingId });

        if (existingReview) {
            if (
                existingReview.rating !== normalizedRating ||
                existingReview.comment !== normalizedComment
            ) {
                existingReview.editHistory.push({
                    rating: existingReview.rating,
                    comment: existingReview.comment,
                    editedAt: new Date()
                });
                existingReview.rating = normalizedRating;
                existingReview.comment = normalizedComment;
                existingReview.isEdited = true;
                existingReview.isHidden = false;
                await existingReview.save();
            }

            return res.json({ success: true, message: "Thank you for your feedback!", review: serializeReview(existingReview) });
        }

        const createdReview = await Review.create({
            bookingId,
            userId,
            rating: normalizedRating,
            comment: normalizedComment,
            images: [],
            isHidden: false
        });

        const recipients = await userModel.find({ role: { $in: ["admin", "staff"] } }).select("_id");
        if (recipients.length > 0) {
            await createOrRefreshNotifications(
                recipients.map((recipient) => ({
                    recipient: recipient._id,
                    sender: userId,
                    type: "new_review",
                    message: `New ${normalizedRating}-star review received.`,
                    link: `/admin/reviews?reviewId=${createdReview._id}`,
                    isRead: false
                }))
            );
        }

        res.json({ success: true, message: "Thank you for your feedback!" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const addReviewChat = async (req, res) => {
    try {
        const { bookingId, message } = req.body;
        const userId = req.userId;
        const normalizedMessage = String(message || "").trim();

        if (!normalizedMessage) {
            return res.json({ success: false, message: "Reply cannot be empty" });
        }

        const review = await Review.findOne({ bookingId });

        if (!review) {
            return res.json({ success: false, message: "Review not found" });
        }

        if (String(review.userId) !== String(userId)) {
            return res.json({ success: false, message: "Unauthorized booking access" });
        }

        review.reviewChat.push({
            senderId: userId,
            senderRole: 'guest',
            message: normalizedMessage,
            createdAt: new Date()
        });
        await review.save();

        res.json({ success: true, message: "Reply added" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const deleteReviewReply = async (req, res) => {
    try {
        const { bookingId, chatId } = req.body;
        const userId = req.userId;

        const review = await Review.findOne({ bookingId, userId });
        if (!review) {
            return res.json({ success: false, message: "Review not found" });
        }

        const reply = review.reviewChat.id(chatId);
        if (!reply || reply.senderRole !== "guest" || String(reply.senderId || "") !== String(userId)) {
            return res.json({ success: false, message: "Reply not found or unauthorized" });
        }

        review.reviewChat.pull(chatId);
        await review.save();

        res.json({ success: true, message: "Reply deleted successfully" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const getAllPublicReviews = async (req, res) => {
    try {
        const query = req.userId
            ? {
                $or: [
                    { isHidden: false },
                    { isHidden: true, userId: req.userId }
                ]
            }
            : { isHidden: false };

        const reviews = await Review.find(query)
            .populate("userId", "firstName middleName lastName image")
            .populate({
                path: "reviewChat.senderId",
                select: "firstName middleName lastName image",
                options: { strictPopulate: false }
            })
            .populate({
                path: "bookingId",
                select: `${BOOKING_DATE_SELECT} bookingName bookingItems extraPackages venueParticipants totalPrice status paymentStatus`,
                populate: [
                    {
                        path: "bookingItems.roomId",
                        populate: roomReferencePopulate
                    },
                    {
                        path: "bookingItems.packageId",
                        populate: packageReferencePopulate
                    },
                    {
                        path: "extraPackages",
                        populate: packageReferencePopulate
                    }
                ]
            })
            .sort({ createdAt: -1 });
        res.json({ success: true, reviews: reviews.map((item) => serializeReview(item)) });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ✅ CHECK EMAIL LOGIC
const checkEmailExists = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email || !validator.isEmail(email)) {
            return res.json({ success: true, exists: false }); 
        }

        const user = await userModel.findOne({ email: email.toLowerCase().trim() });
        
        // If user exists and is fully registered (not just a pending OTP dummy)
        if (hasClaimedEmail(user)) {
            return res.json({ success: true, exists: true });
        }
        
        res.json({ success: true, exists: false });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ✅ CHECK PHONE LOGIC
const checkEmailExistsForUpdate = async (req, res) => {
    try {
        const userId = req.userId;
        const normalizedEmail = normalizeEmail(req.body.email);

        if (!normalizedEmail || !validator.isEmail(normalizedEmail)) {
            return res.json({ success: true, exists: false });
        }

        const user = await userModel.findOne({
            email: normalizedEmail,
            _id: { $ne: userId }
        });

        res.json({ success: true, exists: Boolean(user) });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const checkPhoneExists = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone || phone.length < 11) {
            return res.json({ success: true, exists: false });
        }

        const user = await userModel.findOne({ phone: phone.trim() });

        if (hasClaimedPhone(user)) {
            return res.json({ success: true, exists: true });
        }

        res.json({ success: true, exists: false });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const checkPhoneExistsForUpdate = async (req, res) => {
    try {
        const userId = req.userId;
        const { phone } = req.body;
        const phoneCandidates = buildPhoneCandidates(phone);

        if (phoneCandidates.length === 0 || !isValidPHPhone(normalizePHPhone(phone))) {
            return res.json({ success: true, exists: false });
        }

        const user = await userModel.findOne({
            phone: { $in: phoneCandidates },
            _id: { $ne: userId }
        });

        res.json({ success: true, exists: hasClaimedPhone(user) });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export {
    registerUser, 
    loginUser, 
    sendOTP,
    sendEmailChangeOTP,
    sendPhoneOTP,
    sendPhoneOTPUpdate,
    verifyPhoneFirebase,
    requestPasswordReset,
    requestPhoneReset,
    resetPassword,
    verifyOTP,
    verifyPhoneOTP,
    verifyEmailChangeOTP,
    verifyPhoneOTPUpdate,
    checkEmailExists,
    checkEmailExistsForUpdate,
    checkPhoneExists,
    checkPhoneExistsForUpdate,
    googleAuth, 
    getUserData, 
    updateUserProfile,
    getUserBookings, 
    createBooking, 
    cancelBooking,
    createCheckoutSession, 
    verifyPayment, 
    markCashPayment, 
    confirmCashPayment, 
    rateBooking, 
    addReviewChat, 
    deleteReviewReply, 
    getAllPublicReviews
};
