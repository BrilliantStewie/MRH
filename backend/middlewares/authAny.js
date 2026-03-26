import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import {
  getDecodedSessionVersion,
  getSessionVersion,
} from "../utils/sessionVersion.js";

const authAny = async (req, _res, next) => {
  try {
    const token =
      req.headers.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.id);

    if (!user) {
      return next();
    }

    if (getSessionVersion(user) !== getDecodedSessionVersion(decoded)) {
      return next();
    }

    if (user.disabled) {
      return next();
    }

    req.userId = user._id;
    req.userRole = user.role || "guest";
    req.userName = user.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : "User";

    next();
  } catch {
    next();
  }
};

export default authAny;
