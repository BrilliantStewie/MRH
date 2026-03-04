import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";
import axios from "axios"; 
import userModel from "../models/userModel.js";
import bookingModel from "../models/bookingModel.js";
import cloudinary from "../config/cloudinary.js"; 
import sendEmail from "../utils/sendEmail.js";
import sendSMS from "../utils/sendSMS.js";

// --- HELPERS ---
const createToken = (id, name, role) => {
    return jwt.sign(
        { id, name, role },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );
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

// --- AUTHENTICATION ---

// ✅ Send OTP for Email Verification or Password Reset
const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Invalid email" });
        }

        let user = await userModel.findOne({ email: email.toLowerCase().trim() });

        // ✅ PREVENT SENDING OTP IF EMAIL IS ALREADY TAKEN BY A VERIFIED USER
        if (user && user.isVerified && user.firstName !== "Pending") {
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
                phone: "0000000000",
                isVerified: false
            });
            await user.save();
        }

        await sendEmail(
            email,
            "Security Verification Code",
            `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #1A2B32;">Security Verification</h2>
                    <p>Use the following code to verify your identity. This code is valid for 10 minutes.</p>
                    <h1 style="color:#2563EB; letter-spacing: 5px; background: #f3f4f6; padding: 10px; text-align: center;">${otp}</h1>
                    <p style="color: #666; font-size: 12px;">If you did not request this code, please ignore this email.</p>
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
        const { phone } = req.body;

        if (!phone || phone.length < 11) {
            return res.json({ success: false, message: "Invalid phone number" });
        }

        let user = await userModel.findOne({ phone: phone.trim() });

        // ✅ PREVENT SENDING OTP IF PHONE IS ALREADY TAKEN BY A VERIFIED USER
        if (user && user.isVerified && user.firstName !== "Pending") {
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
                phone,
                email: `phone_${Date.now()}_${phone}@mrh.local`,
                otp,
                otpExpires,
                firstName: "Pending",
                lastName: "Phone User",
                password: dummyPassword,
                isVerified: false
            });

            await user.save();
        }

        // ✅ ACTUAL SMS SENDING
        await sendSMS(
            phone,
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

        return sendOTP(req, res);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ✅ Handle Password Reset Request (Phone)
const requestPhoneReset = async (req, res) => {
    try {
        const { phone } = req.body;
        const user = await userModel.findOne({ phone });

        if (!user) {
            return res.json({ success: false, message: "No account found with this phone number" });
        }

        return sendPhoneOTP(req, res);
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await userModel.findOne({ email: email.toLowerCase().trim() });

        if (!user) return res.json({ success: false, message: "User not found" });

        const storedOtp = user.otp ? String(user.otp).trim() : null;
        const providedOtp = otp ? String(otp).trim() : null;

        if (!storedOtp || storedOtp !== providedOtp) {
            return res.json({ success: false, message: "Invalid reset code" });
        }

        if (new Date() > new Date(user.otpExpires)) {
            return res.json({ success: false, message: "Code has expired" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        user.otp = null;
        user.otpExpires = null;
        user.isVerified = true; 

        await user.save();

        await sendEmail(
            user.email,
            "Password Reset Successful",
            `<p>Hello ${user.firstName},</p><p>Your password has been successfully updated. If you did not perform this action, please contact us immediately.</p>`
        );

        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const googleAuth = async (req, res) => {
    try {
        const { email, displayName, photoURL } = req.body;
        let user = await userModel.findOne({ email });

        if (user) {
            if (user.disabled) {
                return res.json({ success: false, message: "Account disabled. Contact admin." });
            }
        } else {
            const parts = displayName.split(" ");
            const firstName = parts[0];
            const lastName = parts.length > 1 ? parts[parts.length - 1] : "User";
            const middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(Math.random().toString(36), salt);

            user = new userModel({
                firstName,
                middleName,
                lastName,
                email,
                image: photoURL,
                password: hashedPassword,
                phone: "0000000000",
                isVerified: true 
            });
            await user.save();

            await sendEmail(
                email,
                "Welcome to Mercedarian Retreat House",
                `<h3>Welcome, ${firstName}!</h3><p>Your account has been created via Google. We are happy to have you!</p>`
            );
        }

        const token = createToken(user._id, `${user.firstName} ${user.lastName}`, user.role);
        res.json({ success: true, token });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const registerUser = async (req, res) => {
    try {
        const { firstName, middleName, lastName, suffix, email, password, phone } = req.body;

        if (!firstName || !lastName || !email || !password || !phone) {
            return res.json({ success: false, message: "Missing details" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const existingUser = await userModel.findOne({ email });

        if (existingUser) {
            if (existingUser.isVerified && existingUser.firstName !== "Pending") {
                return res.json({ success: false, message: "User already exists" });
            }
            existingUser.firstName = firstName;
            existingUser.middleName = middleName || "";
            existingUser.lastName = lastName;
            existingUser.suffix = suffix || "";
            existingUser.password = hashedPassword;
            existingUser.phone = phone;
            existingUser.isVerified = true; 
            await existingUser.save();
        } else {
            const newUser = new userModel({
                firstName,
                middleName: middleName || "",
                lastName,
                suffix: suffix || "",
                email,
                password: hashedPassword,
                phone,
                isVerified: true 
            });
            await newUser.save();
        }

        await sendEmail(
            email,
            "Account Created Successfully",
            `<h3>Welcome to Mercedarian Retreat House, ${firstName}!</h3><p>Your account is now active. You can start booking your stay with us.</p>`
        );

        res.json({ success: true, message: "Account created successfully" });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({
    email: email.toLowerCase().trim()
});
        
        if (!user) return res.json({ success: false, message: "User does not exist" });
        if (user.disabled) return res.json({ success: false, message: "Account disabled. Contact admin." });
        if (!user.isVerified) return res.json({ success: false, message: "Please verify your email first." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            const token = createToken(user._id, `${user.firstName} ${user.lastName}`, user.role);
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

    user.isVerified = true;

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
        const { firstName, middleName, lastName, suffix, phone, oldPassword, newPassword, removeImage } = req.body;

        const user = await userModel.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found" });

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (suffix) user.suffix = suffix;
        if (typeof middleName !== 'undefined') user.middleName = middleName;
        if (phone) user.phone = phone;

        if (newPassword) {
            if (!oldPassword) return res.json({ success: false, message: "Current password is required" });
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) return res.json({ success: false, message: "Current password is incorrect" });
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
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
        const { roomId, packageId, checkIn, checkOut, participants, totalPrice } = req.body;
        
        const bookingData = {
            user_id: userId,
            room_ids: roomId ? [roomId] : [],
            package_id: packageId || null,
            check_in: new Date(checkIn),
            check_out: new Date(checkOut),
            participants,
            total_price: totalPrice,
            payment: false,
            paymentStatus: 'unpaid',
            paymentMethod: 'n/a'
        };

        const newBooking = new bookingModel(bookingData);
        await newBooking.save();

        const user = await userModel.findById(userId);
        if (user) {
            await sendEmail(
                user.email,
                "Booking Request Submitted",
                `<p>Peace be with you, ${user.firstName},</p>
                 <p>Your booking request for ${new Date(checkIn).toLocaleDateString()} has been received and is currently <b>pending approval</b>.</p>
                 <p>Total Price: <b>PHP ${totalPrice}</b></p>`
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
        const bookings = await bookingModel.find({ user_id: userId })
            .populate("room_ids")
            .populate("package_id", "name")
            .sort({ createdAt: -1 });
        res.json({ success: true, bookings });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await bookingModel.findById(bookingId).populate("user_id");

        if (!booking) return res.json({ success: false, message: "Booking not found" });

        const isApproved = booking.status === 'approved';
        const isPaid = booking.payment === true || booking.paymentStatus === 'paid';

        if (isApproved || isPaid) {
            await bookingModel.findByIdAndUpdate(bookingId, { status: "cancellation_pending" });
            res.json({ success: true, message: "Cancellation request sent for approval" });
        } else {
            await bookingModel.findByIdAndUpdate(bookingId, { status: "cancelled" });
            
            await sendEmail(
                booking.user_id.email,
                "Booking Cancelled",
                `<p>Hello,</p><p>Your booking for ${new Date(booking.check_in).toLocaleDateString()} has been successfully cancelled.</p>`
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
        const { bookingId } = req.body;
        const booking = await bookingModel.findById(bookingId).populate("room_ids").populate("package_id");
        if (!booking) return res.json({ success: false, message: "Booking not found" });

        const itemName = booking.room_ids[0]?.name || booking.package_id?.name || 'Reservation';

        const payload = {
            data: {
                attributes: {
                    send_email_receipt: true,
                    show_description: true,
                    show_line_items: true,
                    description: `Booking for ${itemName}`,
                    line_items: [{
                        currency: 'PHP',
                        amount: booking.total_price * 100,
                        description: 'Reservation Fee',
                        name: itemName,
                        quantity: 1
                    }],
                    payment_method_types: ['gcash', 'card', 'paymaya', 'grab_pay'],
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

        res.json({ success: true, checkoutUrl: response.data.data.attributes.checkout_url });
    } catch (error) {
        res.json({ success: false, message: "Payment initialization failed" });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        const booking = await bookingModel.findByIdAndUpdate(bookingId, { 
            payment: true, 
            paymentStatus: 'paid', 
            paymentMethod: 'online' 
        }, { new: true }).populate("user_id");

        if (booking) {
            await sendEmail(
                booking.user_id.email,
                "Payment Received",
                `<p>Hello ${booking.user_id.firstName},</p><p>Your payment for booking ID ${booking._id} has been verified. Thank you!</p>`
            );
        }

        res.json({ success: true, message: "Payment Verified" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const markCashPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        await bookingModel.findByIdAndUpdate(bookingId, { paymentMethod: 'cash' });
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
        }, { new: true }).populate("user_id");

        if (booking) {
            await sendEmail(
                booking.user_id.email,
                "Payment Confirmed",
                `<p>Hello ${booking.user_id.firstName},</p><p>Your cash payment has been confirmed by the administration. Your booking is now fully secured.</p>`
            );
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

        const user = await userModel.findById(userId);
        const userName = user ? `${user.firstName} ${user.lastName}` : "Guest";

        await bookingModel.findByIdAndUpdate(bookingId, { 
            rating, 
            review,
            $push: { 
                reviewChat: {
                    senderName: userName,
                    senderRole: 'guest',
                    message: review,
                    createdAt: new Date()
                }
            }
        });
        res.json({ success: true, message: "Thank you for your feedback!" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const addReviewChat = async (req, res) => {
    try {
        const { bookingId, message } = req.body;
        const userId = req.userId;

        const user = await userModel.findById(userId);
        const userName = user ? `${user.firstName} ${user.lastName}` : "Guest";

        await bookingModel.findByIdAndUpdate(bookingId, {
            $push: {
                reviewChat: {
                    senderName: userName,
                    senderRole: 'guest',
                    message: message,
                    createdAt: new Date()
                }
            }
        });

        res.json({ success: true, message: "Reply added" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const deleteReviewReply = async (req, res) => {
    try {
        const { bookingId, chatId } = req.body;
        const userId = req.userId;

        await bookingModel.findOneAndUpdate(
            { _id: bookingId, user_id: userId },
            { 
                $pull: { 
                    reviewChat: { _id: chatId, senderRole: 'guest' } 
                } 
            }
        );

        res.json({ success: true, message: "Reply deleted successfully" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const getAllPublicReviews = async (req, res) => {
    try {
        const reviews = await bookingModel.find({ 
            rating: { $gt: 0 } 
        })
        .populate("user_id", "firstName lastName image")
        .populate("room_ids", "name")
        .populate("package_id", "name") 
        .sort({ createdAt: -1 });

        res.json({ success: true, reviews });
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
        if (user && user.isVerified && user.firstName !== "Pending") {
            return res.json({ success: true, exists: true });
        }
        
        res.json({ success: true, exists: false });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ✅ CHECK PHONE LOGIC
const checkPhoneExists = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone || phone.length < 11) {
            return res.json({ success: true, exists: false });
        }

        const user = await userModel.findOne({ phone: phone.trim() });

        if (user && user.isVerified && user.firstName !== "Pending") {
            return res.json({ success: true, exists: true });
        }

        res.json({ success: true, exists: false });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export {
    registerUser, 
    loginUser, 
    sendOTP,
    sendPhoneOTP,
    requestPasswordReset,
    requestPhoneReset,
    resetPassword,
    verifyOTP,
    checkEmailExists,
    checkPhoneExists, 
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