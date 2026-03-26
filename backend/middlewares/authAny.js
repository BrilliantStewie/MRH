import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

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

    if ((user.tokenVersion || 0) !== (decoded.tokenVersion ?? 0)) {
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
