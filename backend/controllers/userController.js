import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import axios from "axios"; 
import userModel from "../models/userModel.js";
import bookingModel from "../models/bookingModel.js";
import cloudinary from "../config/cloudinary.js"; 

// --- HELPERS ---
const createToken = (id, name) => {
    return jwt.sign({ id, name }, process.env.JWT_SECRET, { expiresIn: "30d" });
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

const googleAuth = async (req, res) => {
    try {
        const { email, displayName, photoURL } = req.body;
        let user = await userModel.findOne({ email });

        if (!user) {
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
                phone: "0000000000" 
            });
            await user.save();
        }

        const token = createToken(user._id, `${user.firstName} ${user.lastName}`);
        res.json({ success: true, token });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const registerUser = async (req, res) => {
    try {
        const { firstName, middleName, lastName, email, password, phone } = req.body;

        if (!firstName || !lastName || !email || !password || !phone) {
            return res.json({ success: false, message: "Missing details" });
        }
        if (!validator.isEmail(email)) return res.json({ success: false, message: "Invalid email" });
        if (password.length < 8) return res.json({ success: false, message: "Password too short" });

        const exists = await userModel.findOne({ email });
        if (exists) return res.json({ success: false, message: "User already exists" });

        let imageUrl = "";
        if (req.file) {
            const result = await streamUpload(req.file.buffer);
            imageUrl = result.secure_url;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({ 
            firstName, 
            middleName: middleName || "", 
            lastName, 
            email, 
            password: hashedPassword, 
            phone, 
            image: imageUrl 
        });

        const user = await newUser.save();
        const token = createToken(user._id, `${user.firstName} ${user.lastName}`);
        res.json({ success: true, token });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });
        if (!user) return res.json({ success: false, message: "User does not exist" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            const token = createToken(user._id, `${user.firstName} ${user.lastName}`);
            res.json({ success: true, token });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const getUserData = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId; 
        const userData = await userModel.findById(userId).select("-password");
        res.json({ success: true, userData });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId;
        const { firstName, middleName, lastName, phone, email, oldPassword, newPassword, removeImage } = req.body;

        const user = await userModel.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found" });

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
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
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

// --- BOOKING LOGIC ---

const createBooking = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId;
        const { roomId, checkIn, checkOut, participants, totalPrice } = req.body;
        
        const bookingData = {
            user_id: userId,
            room_ids: [roomId],
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
        res.json({ success: true, message: "Booking Created" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const getUserBookings = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId;
        const bookings = await bookingModel.find({ user_id: userId }).populate("room_ids").sort({ createdAt: -1 });
        res.json({ success: true, bookings });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        
        // Find the booking first to check its current status
        const booking = await bookingModel.findById(bookingId);

        if (!booking) {
            return res.json({ success: false, message: "Booking not found" });
        }

        // Determine the new status based on current progress
        // If it's already approved OR already paid, it requires admin approval to cancel
        const isApproved = booking.status === 'approved';
        const isPaid = booking.payment === true || booking.paymentStatus === 'paid';

        if (isApproved || isPaid) {
            await bookingModel.findByIdAndUpdate(bookingId, { status: "cancellation_pending" });
            res.json({ success: true, message: "Cancellation request sent for approval" });
        } else {
            // If it's still pending and unpaid, cancel it immediately
            await bookingModel.findByIdAndUpdate(bookingId, { status: "cancelled" });
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
        const booking = await bookingModel.findById(bookingId).populate("room_ids");
        if (!booking) return res.json({ success: false, message: "Booking not found" });

        const payload = {
            data: {
                attributes: {
                    send_email_receipt: true,
                    show_description: true,
                    show_line_items: true,
                    description: `Booking for ${booking.room_ids[0]?.name}`,
                    line_items: [{
                        currency: 'PHP',
                        amount: booking.total_price * 100,
                        description: 'Room Reservation',
                        name: booking.room_ids[0]?.name || 'Room Booking',
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
        await bookingModel.findByIdAndUpdate(bookingId, { 
            payment: true, 
            paymentStatus: 'paid', 
            paymentMethod: 'online' 
        });
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
        await bookingModel.findByIdAndUpdate(bookingId, { 
            payment: true,
            paymentStatus: 'paid' 
        });
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

// ✅ NEW: Logic to add a follow-up reply
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

// ✅ NEW: Logic to delete a guest's own reply
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
            rating: { $gt: 0 },
            review: { $ne: "" } 
        })
        .populate("user_id", "firstName lastName image")
        .populate("room_ids", "name")
        .sort({ createdAt: -1 });

        res.json({ success: true, reviews });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    registerUser, loginUser, googleAuth, getUserData, updateUserProfile,
    getUserBookings, createBooking, cancelBooking,
    createCheckoutSession, verifyPayment, markCashPayment, confirmCashPayment, 
    rateBooking, addReviewChat, deleteReviewReply, getAllPublicReviews
};