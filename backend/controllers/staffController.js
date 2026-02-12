import userModel from "../models/userModel.js";
import bookingModel from "../models/bookingModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";

/* =====================================================
   STAFF LOGIN (EMAIL OR PHONE)
===================================================== */
export const staffLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter credentials",
      });
    }

    // 1. Find the user by email or phone
    const user = await userModel.findOne({
      $or: [
        { email: identifier.trim() },
        { phone: identifier.trim() }
      ],
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

    const token = jwt.sign(
      { id: user._id, role: "staff" },
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
    // req.userId usually comes from your auth middleware
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

/* =====================================================
   UPDATE STAFF PROFILE
===================================================== */
export const updateStaffProfile = async (req, res) => {
  try {
    // ✅ ADDED: middleName to destructuring
    const { firstName, lastName, middleName, email, phone, oldPassword, newPassword } = req.body;
    
    const staffId = req.userId || req.user?.id;
    const staff = await userModel.findById(staffId);

    if (!staff || staff.role !== "staff") {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    // ✅ Update fields including Middle Name
    if (firstName) staff.firstName = firstName.trim();
    if (lastName) staff.lastName = lastName.trim();
    if (middleName) staff.middleName = middleName.trim();
    if (phone !== undefined) staff.phone = phone.trim();

    // ✅ Update 'name' composite field with Middle Name logic
    if (firstName || lastName || middleName) {
        const f = firstName || staff.firstName || "";
        const m = middleName || staff.middleName || "";
        const l = lastName || staff.lastName || "";
        // Removes extra spaces if middle name is missing
        staff.name = `${f} ${m} ${l}`.replace(/\s+/g, " ").trim();
    }

    if (email && email !== staff.email) {
      const emailExists = await userModel.findOne({
        email: email.trim(),
        _id: { $ne: staff._id },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
      staff.email = email.trim();
    }

    // Password Update Logic
    if (newPassword && oldPassword) {
       const isMatch = await bcrypt.compare(oldPassword, staff.password);
       if (!isMatch) {
         return res.status(400).json({ success: false, message: "Old password is incorrect" });
       }
       if (newPassword.length < 8) {
         return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
       }
       const salt = await bcrypt.genSalt(10);
       staff.password = await bcrypt.hash(newPassword, salt);
    }

    // CLOUDINARY IMAGE UPLOAD
    if (req.file) {
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

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      userData: staff,
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
   GET STAFF BOOKINGS
===================================================== */
export const getStaffBookings = async (req, res) => {
  try {
    const bookings = await bookingModel.find({})
      // ✅ FIX: Added 'middleName' to populated fields
      .populate("user_id", "name firstName middleName lastName email phone image") 
      .populate("room_ids") 
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      bookings,
    });

  } catch (error) {
    console.error("❌ getStaffBookings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load bookings",
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