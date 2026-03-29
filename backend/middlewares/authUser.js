import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { resolveUserDisableState } from "../utils/accountStatus.js";
import {
  getDecodedSessionVersion,
  getSessionVersion,
} from "../utils/sessionVersion.js";

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

    const accountStatus = await resolveUserDisableState(user);
    if (accountStatus.isDisabled) {
      return res.status(403).json({
        success: false,
        isAccountDisabled: true,
        message: accountStatus.message,
      });
    }

    if (getSessionVersion(user) !== getDecodedSessionVersion(decoded)) {
      return res.status(401).json({
        success: false,
        message: "Session expired due to security changes. Please login again."
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
