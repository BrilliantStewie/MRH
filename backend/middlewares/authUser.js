import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const authUser = async (req, res, next) => {
  try {

    const token =
      req.headers.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Please login again."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists."
      });
    }

    /* ===============================
       CHECK IF ACCOUNT IS DISABLED
    =============================== */

    if (user.disabled) {
      return res.status(403).json({
        success: false,
        isAccountDisabled: true,
        message: "Your account has been disabled. Please contact administration."
      });
    }

    /* ===============================
       ATTACH USER DATA
    =============================== */

    req.userId = user._id;
    req.userRole = user.role || "guest";
    req.userName = user.firstName
      ? `${user.firstName} ${user.lastName || ""}`
      : "User";

    next();

  } catch (error) {

    console.error("User Auth Error:", error.message);

    const message =
      error.name === "TokenExpiredError"
        ? "Session expired. Please login."
        : "Invalid session.";

    return res.status(401).json({
      success: false,
      message
    });

  }
};

export default authUser;