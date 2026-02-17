import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const authStaff = async (req, res, next) => {
  try {
    const token = req.headers.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const user = await User.findById(decoded.id);

    if (!user || user.role !== "staff") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Security check: Match token version to database version
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Session expired due to security changes. Please login again.",
      });
    }

    if (user.disabled) {
      return res.status(403).json({
        success: false,
        message: "Account frozen. Please contact administrator.",
      });
    }

    // ✅ ATTACH DATA FOR CHAT & OTHER CONTROLLERS
    // 'req.user' for general profile/booking use
    req.user = { id: user._id }; 
    
    // Specifically for our addReviewChat controller
    // This allows the chat to log the sender as "Staff [Name]"
    req.role = "staff"; 

    // Handle pipe-string cleanup for chat display if necessary
    if (user.name && user.name.includes('|')) {
        req.userName = user.name.split('|')[0]; // Use first name if using composite string
    } else {
        req.userName = user.name; 
    }

    next();
  } catch (error) {
    console.error("❌ authStaff error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Session invalid or expired",
    });
  }
};

export default authStaff;