import validator from "validator";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";

// Models
import userModel from "../models/userModel.js";
import roomModel from "../models/roomModel.js";
import bookingModel from "../models/bookingModel.js";

// ----------------------------------------------------------------------
// 🛠️ CLOUD HELPER
// ----------------------------------------------------------------------
const streamUpload = (fileBuffer, folderName = "general") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: folderName },
            (error, result) => {
                if (result) resolve(result);
                else reject(error);
            }
        );
        stream.end(fileBuffer);
    });
};

// ----------------------------------------------------------------------
// 🔐 AUTHENTICATION
// ----------------------------------------------------------------------

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign({ email, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1d" });
            res.json({ success: true, token });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ----------------------------------------------------------------------
// 📊 DASHBOARD & ANALYTICS
// ----------------------------------------------------------------------

const adminDashboard = async (req, res) => {
    try {
        const users = await userModel.find({});
        const rooms = await roomModel.find({});
        const bookings = await bookingModel.find({})
            .populate("user_id", "name firstName lastName middleName images")
            .populate("room_ids", "name")
            .sort({ createdAt: -1 });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let activeGuests = 0;
        let activeRooms = 0;
        let totalRevenue = 0;
        const monthlyRevenue = {};
        const dayOfWeekCount = new Array(7).fill(0);

        bookings.forEach((b) => {
            const start = new Date(b.check_in);
            const end = new Date(b.check_out);

            if (b.status === "approved" && !isNaN(start) && !isNaN(end) && start <= today && end > today) {
                activeGuests += b.participants || 0;
                activeRooms += b.room_ids?.length || 0;
            }

            if (b.status === "approved" && (b.paymentStatus === "paid" || b.payment === true)) {
                totalRevenue += b.total_price || 0;
                const date = new Date(b.createdAt);
                if (!isNaN(date)) {
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                    monthlyRevenue[key] = (monthlyRevenue[key] || 0) + (b.total_price || 0);
                }
                const checkInDate = new Date(b.check_in);
                if (!isNaN(checkInDate)) dayOfWeekCount[checkInDate.getDay()]++;
            }
        });

        const sortedKeys = Object.keys(monthlyRevenue).sort();
        const last12 = sortedKeys.slice(-12);
        const revenueTrend = last12.map((key) => {
            const [year, month] = key.split("-");
            return {
                name: new Date(year, month - 1).toLocaleString("default", { month: "short" }),
                revenue: monthlyRevenue[key],
            };
        });

        let predictedRevenue = 0;
        if (revenueTrend.length >= 2) {
            const last = revenueTrend[revenueTrend.length - 1].revenue;
            const prev = revenueTrend[revenueTrend.length - 2].revenue;
            const growth = prev > 0 ? (last - prev) / prev : 0;
            predictedRevenue = Math.max(0, last * (1 + growth));
        }

        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const busiestDay = Math.max(...dayOfWeekCount) > 0 ? days[dayOfWeekCount.indexOf(Math.max(...dayOfWeekCount))] : "N/A";

        res.json({
            success: true,
            dashData: {
                users: users.length,
                rooms: rooms.length,
                bookings: bookings.length,
                activeGuests,
                activeRooms,
                totalRevenue,
                latestBookings: bookings.slice(0, 5),
                revenueTrend,
                predictedRevenue,
                busiestDay,
            },
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ----------------------------------------------------------------------
// 👥 USER & STAFF MANAGEMENT
// ----------------------------------------------------------------------

const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.find({});
        res.json({ success: true, users });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

/**
 * NEW: Create Guest Account 
 * Designed for non-tech users (Email, Phone, Password are optional)
 */
const addGuestUser = async (req, res) => {
    try {
        const { firstName, middleName, lastName, email, phone, password } = req.body;

        if (!firstName || !lastName) {
            return res.json({ success: false, message: "First and Last names are required" });
        }

        // Check uniqueness only if email is provided
        if (email && email.trim() !== "") {
            const exists = await userModel.findOne({ email });
            if (exists) return res.json({ success: false, message: "Email already registered" });
        }

        const salt = await bcrypt.genSalt(10);
        // If no password provided, use a random one (they can reset later or admin handles it)
        const finalPassword = password || Math.random().toString(36).slice(-10);
        const hashedPassword = await bcrypt.hash(finalPassword, salt);

        const fullName = `${firstName} ${middleName || ""} ${lastName}`.replace(/\s+/g, " ").trim();

        const newUser = new userModel({
            name: fullName,
            firstName,
            middleName: middleName || "",
            lastName,
            email: email || "", 
            password: hashedPassword,
            phone: phone || "",
            role: 'user'
        });

        await newUser.save();
        res.json({ success: true, message: "Guest account created successfully!" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const createStaff = async (req, res) => {
    try {
        const { firstName, middleName, lastName, email, password, phone } = req.body;
        if (!firstName || !lastName || !email || !password || !phone) {
            return res.json({ success: false, message: "Missing details" });
        }

        const exists = await userModel.findOne({ email });
        if (exists) return res.json({ success: false, message: "Email already registered" });

        let imageUrl = "";
        if (req.file) {
            const result = await streamUpload(req.file.buffer, "staff_profiles");
            imageUrl = result.secure_url;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const fullName = `${firstName} ${middleName || ""} ${lastName}`.replace(/\s+/g, " ").trim();

        const newStaff = new userModel({
            name: fullName,
            firstName,
            middleName: middleName || "",
            lastName,
            email,
            password: hashedPassword,
            phone,
            image: imageUrl,
            role: 'staff'
        });

        await newStaff.save();
        res.json({ success: true, message: "Staff account created successfully!" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const updateStaff = async (req, res) => {
    try {
        const { userId, firstName, lastName, middleName, phone, email, removeImage, password } = req.body;
        if (!userId) return res.json({ success: false, message: "User ID is required" });

        const user = await userModel.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found" });

        // Email conflict check (if email is being changed)
        if (email && email !== user.email) {
            const emailExists = await userModel.findOne({ email, _id: { $ne: userId } });
            if (emailExists) return res.json({ success: false, message: "Email already taken" });
            user.email = email;
        }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (middleName !== undefined) user.middleName = middleName;
        if (phone) user.phone = phone;

        const f = user.firstName || "";
        const m = user.middleName || "";
        const l = user.lastName || "";
        user.name = `${f} ${m} ${l}`.replace(/\s+/g, " ").trim();

        if (password && password.length >= 8) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        if (req.file) {
            const result = await streamUpload(req.file.buffer, "staff_profiles");
            user.image = result.secure_url;
        } else if (removeImage === "true") {
            user.image = ""; 
        }

        await user.save();
        res.json({ success: true, message: "Profile updated successfully" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const changeUserStatus = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await userModel.findById(userId);
        if (!user) return res.json({ success: false, message: "User not found" });

        user.disabled = !user.disabled;
        await user.save();
        res.json({ success: true, message: user.disabled ? "Account Frozen" : "Account Activated" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ----------------------------------------------------------------------
// 🛏️ ROOM MANAGEMENT
// ----------------------------------------------------------------------

const addRoom = async (req, res) => {
    try {
        const { name, room_type, building, capacity, description, amenities } = req.body;
        const imagesFiles = req.files; 

        if (!name || !capacity) return res.json({ success: false, message: "Missing required details" });

        let imagesUrls = [];
        if (imagesFiles && imagesFiles.length > 0) {
            const uploadPromises = imagesFiles.map(file => streamUpload(file.buffer, "room_images"));
            const results = await Promise.all(uploadPromises);
            imagesUrls = results.map(r => r.secure_url);
        }

        const newRoom = new roomModel({
            name, 
            room_type, 
            building, 
            capacity: Number(capacity), 
            description, 
            amenities: amenities ? (typeof amenities === "string" ? JSON.parse(amenities) : amenities) : [], 
            images: imagesUrls, 
            available: true
        });

        await newRoom.save();
        res.json({ success: true, message: "Room Added" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const updateRoom = async (req, res) => {
    try {
        const { roomId, id, existingimages, ...updateData } = req.body;
        const recordId = roomId || id;
        if (!recordId) return res.json({ success: false, message: "Room ID missing" });

        const imagesFiles = req.files;
        let finalimages = existingimages ? (typeof existingimages === 'string' ? JSON.parse(existingimages) : existingimages) : [];

        if (imagesFiles && imagesFiles.length > 0) {
            const uploadPromises = imagesFiles.map(file => streamUpload(file.buffer, "room_images"));
            const results = await Promise.all(uploadPromises);
            finalimages = [...finalimages, ...results.map(r => r.secure_url)];
        }

        updateData.images = finalimages;
        if (updateData.amenities) {
            updateData.amenities = typeof updateData.amenities === 'string' ? JSON.parse(updateData.amenities) : updateData.amenities;
        }

        await roomModel.findByIdAndUpdate(recordId, updateData);
        res.json({ success: true, message: "Room Updated" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const getAllRooms = async (req, res) => {
    try {
        const rooms = await roomModel.find({});
        res.json({ success: true, rooms });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const changeAvailability = async (req, res) => {
    try {
        const { roomId } = req.body;
        const room = await roomModel.findById(roomId);
        room.available = !room.available;
        await room.save();
        res.json({ success: true, message: "Availability Changed" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const deleteRoom = async (req, res) => {
    try {
        const { id } = req.body; 
        if (!id) return res.json({ success: false, message: "Room ID required" });
        const deletedRoom = await roomModel.findByIdAndDelete(id);
        res.json({ success: !!deletedRoom, message: deletedRoom ? "Room deleted successfully" : "Room not found" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ----------------------------------------------------------------------
// 🗓️ BOOKING MANAGEMENT
// ----------------------------------------------------------------------

const allBookings = async (req, res) => {
    try {
        const bookings = await bookingModel.find({})
            .populate('user_id', '-password') 
            .populate('room_ids') 
            .sort({ createdAt: -1 });

        res.json({ success: true, bookings });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const approveBooking = async (req, res) => {
    try {
        const { bookingId } = req.params; 
        await bookingModel.findByIdAndUpdate(bookingId, { status: 'approved' });
        res.json({ success: true, message: "Booking Approved" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const declineBooking = async (req, res) => {
    try {
        const { bookingId } = req.params; 
        await bookingModel.findByIdAndUpdate(bookingId, { status: 'declined' });
        res.json({ success: true, message: "Booking Declined" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const paymentConfirmed = async (req, res) => {
    try {
        const { bookingId } = req.body;
        await bookingModel.findByIdAndUpdate(bookingId, { payment: true, paymentStatus: 'paid', paymentMethod: 'cash' });
        res.json({ success: true, message: "Payment status updated to PAID" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const resolveCancellation = async (req, res) => {
    try {
        const { bookingId } = req.body;
        await bookingModel.findByIdAndUpdate(bookingId, { status: 'cancelled', paymentStatus: 'refunded' });
        res.json({ success: true, message: "Cancellation Resolved" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const approveCancellationRequest = async (req, res) => {
    try {
        const { bookingId, action } = req.body;
        const status = action === 'approve' ? 'cancelled' : 'approved';
        await bookingModel.findByIdAndUpdate(bookingId, { status });
        res.json({ success: true, message: `Cancellation ${action === 'approve' ? 'Approved' : 'Rejected'}.` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const checkExpiredCancellations = async (req, res) => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        await bookingModel.updateMany(
            { status: 'cancellation_pending', updatedAt: { $lt: twentyFourHoursAgo } },
            { $set: { status: 'cancelled' } }
        );
        res.json({ success: true, message: `Processed expired requests.` });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ----------------------------------------------------------------------
// 📤 EXPORTS
// ----------------------------------------------------------------------

export {
    loginAdmin, 
    adminDashboard, 
    getAllUsers, 
    addGuestUser, // Added for your guest creation      
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
    resolveCancellation, 
    paymentConfirmed, 
    approveCancellationRequest,
    checkExpiredCancellations
};