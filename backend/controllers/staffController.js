import User from "../models/userModel.js";
import Booking from "../models/bookingModel.js";
// ✅ FIXED: Default import gets the cloudinary object
import cloudinary from "../config/cloudinary.js"; 

/* =====================================================
   GET STAFF PROFILE
===================================================== */
export const getStaffProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const staff = await User.findById(req.user.id).select("-password");

    if (!staff || staff.role !== "staff") {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    return res.status(200).json({ success: true, userData: staff });
  } catch (error) {
    console.error("❌ getStaffProfile error:", error);
    return res.status(500).json({ success: false, message: "Failed to load staff profile" });
  }
};

/* =====================================================
   UPDATE STAFF PROFILE
===================================================== */
export const updateStaffProfile = async (req, res) => {
  try {
    const { name, email, phone } = req.body || {};
    const staff = await User.findById(req.user.id);

    if (!staff || staff.role !== "staff") {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    // 1. Update Text Fields
    if (name?.trim()) staff.name = name.trim();
    if (phone !== undefined) staff.phone = phone.trim();

    // 2. Update Email
    if (email && email !== staff.email) {
      const emailExists = await User.findOne({ email: email.trim(), _id: { $ne: staff._id } });
      if (emailExists) return res.status(400).json({ success: false, message: "Email already in use" });
      staff.email = email.trim();
    }

    // 3. Update Password
    if (req.body.newPassword) {
        // Assuming your User model handles hashing on save
        staff.password = req.body.newPassword; 
    }

    // 4. Update Image (Cloudinary Stream)
    if (req.file) {
      // Safety check to ensure cloudinary loaded
      if (!cloudinary.uploader) {
        throw new Error("Cloudinary configuration error: uploader not found.");
      }

      // Wrap stream in a promise
      const streamUpload = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "staff_profiles", resource_type: "image" },
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
    return res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

/* =====================================================
   GET STAFF BOOKINGS
===================================================== */
export const getStaffBookings = async (req, res) => {
  try {
    const staff = await User.findById(req.user.id);
    if (!staff || staff.role !== "staff") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const bookings = await Booking.find()
      .populate("user_id", "name email phone image")
      .populate("room_ids")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error("❌ getStaffBookings error:", error);
    return res.status(500).json({ success: false, message: "Failed to load bookings" });
  }
};

/* =====================================================
   STAFF DASHBOARD STATS
===================================================== */
export const getStaffDashboardStats = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: "Pending" });
    const approvedBookings = await Booking.countDocuments({ status: "Confirmed" });

    return res.status(200).json({
      success: true,
      stats: { totalBookings, pendingBookings, approvedBookings },
    });
  } catch (error) {
    console.error("❌ getStaffDashboardStats error:", error);
    return res.status(500).json({ success: false, message: "Failed to load dashboard stats" });
  }
};