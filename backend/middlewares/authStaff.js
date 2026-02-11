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

    const user = await User.findById(decoded.id).select("-password");

    if (!user || user.role !== "staff") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // ✅ THIS IS THE IMPORTANT LINE
    req.user = { id: user._id };

    next();
  } catch (error) {
    console.error("❌ authStaff error:", error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};

export default authStaff;
