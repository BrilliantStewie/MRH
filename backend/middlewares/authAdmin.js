import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const authAdmin = async (req, res, next) => {
  try {
    // ==============================
    // 1️⃣ Extract Token
    // ==============================
    const token =
      req.headers.token ||
      req.headers.atoken ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized. Please login again."
      });
    }

    // ==============================
    // 2️⃣ Verify JWT
    // ==============================
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid Token"
      });
    }

    // ==============================
    // 3️⃣ Allow Only Admin or Staff
    // ==============================
    const allowedRoles = ["admin", "staff"];

    if (!allowedRoles.includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Insufficient permissions."
      });
    }

    // ==============================
    // 4️⃣ Database Validation
    // ==============================
    // Skip DB check for dummy admin
    let user = null;

    if (decoded.id !== "000000000000000000000000") {
      user = await userModel.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User account no longer exists."
        });
      }

      if (user.disabled) {
        return res.status(403).json({
          success: false,
          message: "Your account has been disabled."
        });
      }
    }

    // ==============================
    // 5️⃣ UNIFIED ATTACHED DATA
    // (Works for BOTH admin & reviewController)
    // ==============================

    const displayName =
      decoded.name ||
      (user
        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
        : decoded.role === "admin"
        ? "Administrator"
        : "Staff Member");

    // 🔹 Standardized fields (IMPORTANT)
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.userName = displayName;

    // 🔹 Optional legacy fields (for adminController)
    req.adminId = decoded.id;
    req.adminRole = decoded.role;
    req.adminName = displayName;

    next();

  } catch (error) {
    console.error("Auth Admin Error:", error.message);

    const message =
      error.name === "TokenExpiredError"
        ? "Session Expired"
        : "Invalid Token";

    return res.status(401).json({
      success: false,
      message
    });
  }
};

export default authAdmin;