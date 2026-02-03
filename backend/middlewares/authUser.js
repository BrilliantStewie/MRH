// This file was already correct, keeping it here for confirmation
import jwt from "jsonwebtoken";

const authUser = (req, res, next) => {
  try {
    const token = req.headers.token;
    if (!token) {
      return res.json({ success: false, message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; 

    next();
  } catch (error) {
    return res.json({ success: false, message: "Invalid token" });
  }
};

export default authUser;