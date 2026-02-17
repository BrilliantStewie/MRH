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

/* =====================================================
   UPDATE STAFF PROFILE
===================================================== */
export const updateStaffProfile = async (req, res) => {
  try {
    // 1. Destructure data (Note: 'name' comes as "First|Mid|Last|Suffix")
    const { name, email, phone, oldPassword, newPassword, removeImage } = req.body;
    
    const staffId = req.userId || req.user?.id;
    const staff = await userModel.findById(staffId);

    if (!staff || staff.role !== "staff") {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    // --- 2. NAME UPDATE LOGIC ---
    // The frontend sends the composite string: "First|Mid|Last|Suffix"
    if (name) {
        staff.name = name; // Save the full pipe-string so frontend can parse it back later

        if (name.includes('|')) {
            const [first, mid, last, suffix] = name.split('|');
            staff.firstName = first || "";
            staff.middleName = mid || "";
            // Append suffix to lastName for sorting/searching purposes if your DB lacks a suffix field
            staff.lastName = suffix ? `${last} ${suffix}` : last || "";
        } else {
            // Fallback: If for some reason pipes aren't used
            staff.firstName = name.split(' ')[0] || "";
            staff.lastName = name.split(' ').slice(1).join(' ') || "";
        }
    }

    // --- 3. PHONE & EMAIL UPDATE ---
    if (phone) staff.phone = phone.trim();

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

    // --- 4. PASSWORD UPDATE ---
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
       staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    }

    // --- 5. IMAGE HANDLING (Upload OR Remove) ---
    if (removeImage === 'true') {
        // User clicked the trash icon
        staff.image = ""; 
    } else if (req.file) {
      // User uploaded a new photo
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