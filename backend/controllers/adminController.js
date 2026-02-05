import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";

// Models
import userModel from "../models/userModel.js";
import roomModel from "../models/roomModel.js";
import bookingModel from "../models/bookingModel.js";

// ----------------------------------------------------------------------
// 🔐 AUTHENTICATION
// ----------------------------------------------------------------------

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      // ✅ Fix: Use process.env.JWT_SECRET
const token = jwt.sign({ email, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1d" })
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------------------------
// 📊 DASHBOARD & ANALYTICS (FIXED)
// ----------------------------------------------------------------------

const adminDashboard = async (req, res) => {
  try {
    const users = await userModel.find({});
    const rooms = await roomModel.find({});

    const bookings = await bookingModel.find({})
      .populate("user_id", "name images")
      .populate("room_ids", "name")
      .sort({ createdAt: -1 });

    // ================================
    // DATE SETUP
    // ================================
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activeGuests = 0;
    let activeRooms = 0;
    let totalRevenue = 0;

    const monthlyRevenue = {};
    const dayOfWeekCount = new Array(7).fill(0);

    // ================================
    // MAIN LOOP
    // ================================
    bookings.forEach((b) => {
      const start = new Date(b.check_in);
      const end = new Date(b.check_out);

      // 🏨 OCCUPANCY (approved only)
      if (
        b.status === "approved" &&
        !isNaN(start) &&
        !isNaN(end) &&
        start <= today &&
        end > today
      ) {
        activeGuests += b.participants || 0;
        activeRooms += b.room_ids?.length || 0;
      }

      // 💰 REVENUE (approved + paid only)
      if (
        b.status === "approved" &&
        (b.paymentStatus === "paid" || b.payment === true)
      ) {
        totalRevenue += b.total_price || 0;

        // Monthly grouping
        const date = new Date(b.createdAt);
        if (!isNaN(date)) {
          const key = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;
          monthlyRevenue[key] =
            (monthlyRevenue[key] || 0) + (b.total_price || 0);
        }

        // Busiest day (check-in)
        const checkInDate = new Date(b.check_in);
        if (!isNaN(checkInDate)) {
          dayOfWeekCount[checkInDate.getDay()]++;
        }
      }
    });

    // ================================
    // REVENUE TREND (LAST 12 MONTHS)
    // ================================
    const sortedKeys = Object.keys(monthlyRevenue).sort();
    const last12 = sortedKeys.slice(-12);

    const revenueTrend = last12.map((key) => {
      const [year, month] = key.split("-");
      const date = new Date(year, month - 1);
      return {
        name: date.toLocaleString("default", { month: "short" }),
        revenue: monthlyRevenue[key],
      };
    });

    // ================================
    // SIMPLE FORECAST
    // ================================
    let predictedRevenue = 0;
    if (revenueTrend.length >= 2) {
      const last = revenueTrend[revenueTrend.length - 1].revenue;
      const prev = revenueTrend[revenueTrend.length - 2].revenue;
      const growth = prev > 0 ? (last - prev) / prev : 0;
      predictedRevenue = Math.max(0, last * (1 + growth));
    } else if (revenueTrend.length === 1) {
      predictedRevenue = revenueTrend[0].revenue;
    }

    // ================================
    // BUSIEST DAY
    // ================================
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const max = Math.max(...dayOfWeekCount);
    const busiestDay = max > 0 ? days[dayOfWeekCount.indexOf(max)] : "N/A";

    // ================================
    // RESPONSE
    // ================================
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
    console.log("ADMIN DASHBOARD ERROR:", error);
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
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const createStaff = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    if (!name || !email || !password || !phone) {
        return res.json({ success: false, message: "Missing details" });
    }

    const exists = await userModel.findOne({ email });
    if (exists) {
        return res.json({ success: false, message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newStaff = new userModel({
        name,
        email,
        password: hashedPassword,
        phone,
        role: 'staff'
    });

    await newStaff.save();
    res.json({ success: true, message: "Staff account created successfully!" });

  } catch (error) {
    console.log(error);
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

    // Toggle the disabled status
    await userModel.findByIdAndUpdate(userId, { disabled: !user.disabled });

    res.json({ 
      success: true, 
      message: user.disabled ? "Account Activated" : "Account Frozen" 
    });

  } catch (error) {
    console.log(error);
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
      const uploadPromises = imagesFiles.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, { resource_type: "images" });
        return result.secure_url;
      });
      imagesUrls = await Promise.all(uploadPromises);
    }

    let parsedAmenities = [];
    if (amenities) {
      parsedAmenities = typeof amenities === "string" ? JSON.parse(amenities) : amenities;
    }

    const newRoom = new roomModel({
      name, 
      room_type, 
      building, 
      capacity: Number(capacity), 
      description, 
      amenities: parsedAmenities, 
      images: imagesUrls, 
      available: true
    });

    await newRoom.save();
    res.json({ success: true, message: "Room Added" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const updateRoom = async (req, res) => {
  try {
    const { roomId, id, existingimagess, ...updateData } = req.body;
    const recordId = roomId || id;
    
    if (!recordId) return res.json({ success: false, message: "Room ID missing" });

    const imagesFiles = req.files;
    let finalimagess = [];
    if (existingimagess) {
        finalimagess = typeof existingimagess === 'string' ? JSON.parse(existingimagess) : existingimagess;
    }

    if (imagesFiles && imagesFiles.length > 0) {
      const uploadPromises = imagesFiles.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, { resource_type: "images" });
        return result.secure_url;
      });
      const newUrls = await Promise.all(uploadPromises);
      finalimagess = [...finalimagess, ...newUrls];
    }

    updateData.images = finalimagess;

    if (updateData.amenities) {
      updateData.amenities = typeof updateData.amenities === 'string' ? JSON.parse(updateData.amenities) : updateData.amenities;
    }

    await roomModel.findByIdAndUpdate(recordId, updateData);
    res.json({ success: true, message: "Room Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getAllRooms = async (req, res) => {
  try {
    const rooms = await roomModel.find({});
    res.json({ success: true, rooms });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const changeAvailability = async (req, res) => {
  try {
    const { roomId } = req.body;
    const room = await roomModel.findById(roomId);
    await roomModel.findByIdAndUpdate(roomId, { available: !room.available });
    res.json({ success: true, message: "Availability Changed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.body; 
    
    if (!id) {
        return res.json({ success: false, message: "Room ID required" });
    }

    const deletedRoom = await roomModel.findByIdAndDelete(id);

    if (deletedRoom) {
        res.json({ success: true, message: "Room deleted successfully" });
    } else {
        res.json({ success: false, message: "Room not found" });
    }

  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------------------------
// 🗓️ BOOKING MANAGEMENT
// ----------------------------------------------------------------------

const allBookings = async (req, res) => {
  try {
    const bookings = await bookingModel.find({})
      .populate('user_id', 'name images email')
      .populate('room_ids', 'name images'); 
    res.json({ success: true, bookings });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const approveBooking = async (req, res) => {
  try {
    const { bookingId } = req.params; 
    const updated = await bookingModel.findByIdAndUpdate(bookingId, { status: 'approved' });
    if (!updated) return res.json({ success: false, message: "Booking not found" });
    res.json({ success: true, message: "Booking Approved" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const declineBooking = async (req, res) => {
  try {
    const { bookingId } = req.params; 
    const updated = await bookingModel.findByIdAndUpdate(bookingId, { status: 'declined' });
    if (!updated) return res.json({ success: false, message: "Booking not found" });
    res.json({ success: true, message: "Booking Declined" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const paymentConfirmed = async (req, res) => {
  try {
    const { bookingId } = req.body;
    await bookingModel.findByIdAndUpdate(bookingId, { payment: true, paymentStatus: 'paid', paymentMethod: 'cash' });
    res.json({ success: true, message: "Payment status updated to PAID" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const resolveCancellation = async (req, res) => {
  try {
    const { bookingId } = req.body;
    await bookingModel.findByIdAndUpdate(bookingId, { status: 'cancelled', paymentStatus: 'refunded' });
    res.json({ success: true, message: "Cancellation Resolved" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ----------------------------------------------------------------------
// 🛑 CANCELLATION & APPROVAL LOGIC
// ----------------------------------------------------------------------

const approveCancellationRequest = async (req, res) => {
  try {
    const { bookingId, action } = req.body;
    const booking = await bookingModel.findById(bookingId);
    if (!booking) return res.json({ success: false, message: "Booking not found" });

    if (action === 'approve') {
      booking.status = 'cancelled';
    } else if (action === 'reject') {
      booking.status = 'approved';
    } else {
      return res.json({ success: false, message: "Invalid action" });
    }

    await booking.save();
    res.json({ success: true, message: `Cancellation ${action === 'approve' ? 'Approved' : 'Rejected'}.` });
  } catch (error) {
    console.log(error);
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
    console.log(error);
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
  createStaff,
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