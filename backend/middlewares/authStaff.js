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

    // 1. Decode the token to get the id and the version it was issued with
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // 2. Fetch the user from DB (we need the tokenVersion field)
    const user = await User.findById(decoded.id);

    if (!user || user.role !== "staff") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // 3. ✅ VALIDATION CHECK: Compare Token Version
    // If an admin changed the password, user.tokenVersion will be higher than decoded.tokenVersion
    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Session expired due to security changes. Please login again.",
      });
    }

    // 4. Check if account was disabled while they were logged in
    if (user.disabled) {
      return res.status(403).json({
        success: false,
        message: "Account frozen. Please contact administrator.",
      });
    }

    req.user = { id: user._id };
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