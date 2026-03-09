import validator from "validator";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";

// Models
import userModel from "../models/userModel.js";
import roomModel from "../models/roomModel.js";
import bookingModel from "../models/bookingModel.js";
import buildingModel from "../models/buildingModel.js";
import roomTypeModel from "../models/roomTypeModel.js";
import Notification from "../models/notificationModel.js";

// Utils
import sendEmail from "../utils/sendEmail.js";
import sendSMS from "../utils/sendSMS.js";

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

// ======================================================================
// 🔐 AUTHENTICATION
// ======================================================================

const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(
              { 
                id: "000000000000000000000000", 
                role: "admin", 
                name: "Administrator"
              }, 
              process.env.JWT_SECRET, 
              { expiresIn: "1d" }
            );

            res.json({ success: true, token });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
};

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
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.json({ success: false, message: "Missing details" });
        }

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Invalid email format" });
        }

        if (password.length < 8) {
            return res.json({ success: false, message: "Password must be at least 8 characters" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new userModel({
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'guest',
            image: "" 
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
            tokenVersion: 0 
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
            staff.tokenVersion = (staff.tokenVersion || 0) + 1;
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

const formatPHNumber = (number) => {
  if (!number) return null;

  if (number.startsWith("+63")) {
    return "0" + number.substring(3);
  }

  return number;
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
    await user.save();

    const statusText = user.disabled ? "disabled" : "re-enabled";

    // 🔔 In-app notification
    await Notification.create({
      recipient: user._id,
      type: "account_status",
      message: `Your account has been ${statusText} by the administration.`,
      link: "/login",
      isRead: false
    });

    // 📧 Email
    await sendEmail(
      user.email,
      `Account ${user.disabled ? "Suspension" : "Reactivation"} – Mercedarian Retreat House`,
      `
      <p>Dear ${user.firstName || "User"},</p>
      ${
        user.disabled
          ? `<p>Your account has been <strong>disabled</strong>. Please contact administration.</p>`
          : `<p>Your account has been <strong>re-activated</strong>. You may now log in.</p>`
      }
      <br/>
      <p>Administration Office<br/>Mercedarian Retreat House</p>
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
        const { name, room_type, building, capacity, description, amenities } = req.body;

        if (!name || !room_type || !building || !capacity || !description) {
            return res.json({ success: false, message: "All fields are required" });
        }

        const imageFiles = req.files || [];
        if (imageFiles.length === 0) {
            return res.json({ success: false, message: "At least one room image is required" });
        }

        const imagesUrl = await Promise.all(
            imageFiles.map(item => streamUpload(item.buffer, "mrh_rooms"))
        );

        let parsedAmenities = [];
        try {
            parsedAmenities = JSON.parse(amenities || "[]");
        } catch (e) {
            parsedAmenities = [];
        }

        const roomData = {
            name,
            room_type,
            building,
            capacity: Number(capacity),
            description,
            amenities: parsedAmenities,
            images: imagesUrl,
            cover_image: imagesUrl[0],
            available: true,
            date: Date.now()
        };

        const newRoom = new roomModel(roomData);
        await newRoom.save();

        res.json({ success: true, message: "Room Added Successfully" });

    } catch (error) {
        console.log("Add Room Error:", error);
        res.json({ success: false, message: error.message });
    }
};

const updateRoom = async (req, res) => {
    try {
        const roomId = req.body.roomId || req.body.id; 
        const { name, room_type, building, capacity, description, amenities, existingImages } = req.body;

        const room = await roomModel.findById(roomId);
        if (!room) {
            return res.json({ success: false, message: "Room not found" });
        }

        if (name) room.name = name;
        if (room_type) room.room_type = room_type;
        if (building) room.building = building;
        if (capacity) room.capacity = Number(capacity);
        if (description) room.description = description;
        
        if (amenities) {
            try { 
                room.amenities = JSON.parse(amenities); 
            } catch (e) { 
                room.amenities = []; 
            }
        }

        let finalImages = [];
        if (existingImages) {
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
        if (finalImages.length > 0) room.cover_image = finalImages[0];

        await room.save();
        res.json({ success: true, message: "Room Updated Successfully" });

    } catch (error) {
        console.log("Update Room Error:", error);
        res.json({ success: false, message: error.message });
    }
};

const getAllRooms = async (req, res) => {
    try {
        const rooms = await roomModel.find({}).sort({ createdAt: -1 });
        res.json({ success: true, rooms });
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
        const { id } = req.body;
        await roomModel.findByIdAndDelete(id);
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
        const bookings = await bookingModel.find({})
            .populate('user_id', 'firstName middleName lastName suffix email image phone')
            .populate('bookingItems.room_id')
            .populate('bookingItems.package_id')
            .sort({ date: -1 });

        res.json({ success: true, bookings });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const approveBooking = async (req, res) => {
    try {
        const { bookingId } = req.params; // ✅ FIXED: Changed from req.body to req.params to match adminRoute.js
        const booking = await bookingModel.findByIdAndUpdate(bookingId, { status: 'approved' }, { new: true }).populate('user_id');

        if (!booking) return res.json({ success: false, message: "Booking not found" });

        await Notification.create({
            recipient: booking.user_id._id,
            type: "booking_update",
            message: `Great news! Your booking has been approved by the administration.`,
            link: "/my-bookings"
        });

        await sendEmail(
            booking.user_id.email,
            "Booking Confirmation – Mercedarian Retreat House",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Dear ${booking.user_id.firstName},</p>
                <p>Good day.</p>
                <p>We are pleased to inform you that your booking request has been <strong>approved by the Administration</strong>.</p>
                <p>Your reservation for ${new Date(booking.check_in).toLocaleDateString()} is now confirmed. Please check your dashboard for further details.</p>
                <p>Should you have any inquiries or special requests, please feel free to contact us.</p>
                <br/>
                <p>Thank you for choosing Mercedarian Retreat House.</p>
                <br/>
                <p>Respectfully,<br/>Administration Office<br/>Mercedarian Retreat House</p>
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
        const booking = await bookingModel.findByIdAndUpdate(bookingId, { status: 'declined' }, { new: true }).populate('user_id');

        if (!booking) return res.json({ success: false, message: "Booking not found" });

        await sendEmail(
            booking.user_id.email,
            "Booking Request Update – Mercedarian Retreat House",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Dear ${booking.user_id.firstName},</p>
                <p>We regret to inform you that your booking request has been <strong>declined by the Administration</strong>.</p>
                <p>If you would like to reschedule or submit a new booking request, you may do so through your account.</p>
                <p>For further clarification, please feel free to contact us.</p>
                <br/>
                <p>Thank you for your understanding.</p>
                <br/>
                <p>Administration Office<br/>Mercedarian Retreat House</p>
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
        const booking = await bookingModel.findByIdAndUpdate(bookingId, { payment: true, paymentStatus: 'paid' }, { new: true }).populate('user_id').populate('bookingItems.room_id')

        if (!booking) return res.json({ success: false, message: "Booking not found" });

        await sendEmail(
            booking.user_id.email,
            "Payment Confirmation – Mercedarian Retreat House",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Dear ${booking.user_id.firstName},</p>
                <p>Good day.</p>
                <p>This is to formally confirm that your payment for <strong>${booking.bookingName || booking.room_ids[0]?.name}</strong> has been successfully verified and confirmed by the <strong>Administration</strong>.</p>
                <p>Your reservation is now fully secured. Kindly keep this email for your records.</p>
                <p>We look forward to welcoming you to Mercedarian Retreat House.</p>
                <br/>
                <p>Administration Office<br/>Mercedarian Retreat House</p>
            </div>
            `
        );

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
        const booking = await bookingModel.findByIdAndUpdate(bookingId, { status: 'cancelled' }, { new: true }).populate('user_id');

        if (!booking) return res.json({ success: false, message: "Booking not found" });

        await sendEmail(
            booking.user_id.email,
            "Cancellation Approved – Mercedarian Retreat House",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Dear ${booking.user_id.firstName},</p>
                <p>This is to inform you that your cancellation request has been <strong>approved by the Administration</strong>.</p>
                <p>Your booking has now been officially cancelled in our system.</p>
                <p>If you wish to make a new reservation in the future, we will be happy to assist you.</p>
                <br/>
                <p>Administration Office<br/>Mercedarian Retreat House</p>
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
        
        const booking = await bookingModel.findByIdAndUpdate(bookingId, { status: newStatus }, { new: true }).populate('user_id');

        if (!booking) return res.json({ success: false, message: "Booking not found" });

        await sendEmail(
            booking.user_id.email,
            "Cancellation Request Update – Mercedarian Retreat House",
            `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <p>Dear ${booking.user_id.firstName},</p>
                <p>Your cancellation request has been <strong>${action === 'approve' ? 'approved' : 'reviewed and declined'}</strong> by the Administration.</p>
                ${action === 'approve' ? `<p>Your booking has been successfully cancelled.</p>` : `<p>Your reservation remains active as scheduled.</p>`}
                <p>Should you need further assistance, please contact us.</p>
                <br/>
                <p>Administration Office<br/>Mercedarian Retreat House</p>
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
        const { name } = req.body;
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
        await buildingModel.findByIdAndDelete(id);
        res.json({ success: true, message: "Building Removed" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const updateBuilding = async (req, res) => {
    try {
        const { id, name } = req.body; 

        const buildingDoc = await buildingModel.findById(id);
        if (!buildingDoc) {
            return res.json({ success: false, message: "Building not found" });
        }

        const oldName = buildingDoc.name;
        buildingDoc.name = name;
        await buildingDoc.save();

        await roomModel.updateMany({ building: oldName }, { building: name });

        res.json({ success: true, message: "Building Renamed & Rooms Updated" });
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
        const { name } = req.body;
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
        await roomTypeModel.findByIdAndDelete(id);
        res.json({ success: true, message: "Room Type Removed" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const updateRoomType = async (req, res) => {
    try {
        const { id, name } = req.body;

        const typeDoc = await roomTypeModel.findById(id);
        if (!typeDoc) {
            return res.json({ success: false, message: "Room Type not found" });
        }

        const oldName = typeDoc.name;
        typeDoc.name = name;
        await typeDoc.save();

        await roomModel.updateMany({ room_type: oldName }, { room_type: name });

        res.json({ success: true, message: "Room Type Renamed & Rooms Updated" });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// ======================================================================
// 📤 EXPORTS
// ======================================================================

export {
    loginAdmin, 
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