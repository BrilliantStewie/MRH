import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const authUser = async (req, res, next) => {
  try {
    const token = req.headers.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized. Please login again." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check DB for status and existence
    const user = await userModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: "User account no longer exists." });
    }

    if (user.disabled) {
  return res.status(403).json({ 
    success: false, 
    isAccountDisabled: true, // <--- ADD THIS LINE
    message: "Your account has been disabled. Please contact administration." 
  });
}

    // ✅ Attach user info to request
    req.userId = decoded.id;
    req.userRole = user.role || "guest";
    // Safeguard for missing names
    req.userName = user.firstName ? `${user.firstName} ${user.lastName || ''}` : "User";

    next();

  } catch (error) {
    console.error("User Auth Error:", error.message);
    // Specifically handle expired tokens for better frontend UX
    const message = error.name === "TokenExpiredError" ? "Session expired. Please login." : "Invalid session.";
    return res.status(401).json({ success: false, message });
  }
};

export default authUser;