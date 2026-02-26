import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js"; // 👈 Import your model

const authUser = async (req, res, next) => { // 👈 Make this async
  try {
    const token = req.headers.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 🛑 THE SECURITY CHECK:
    // Look up the user in the database to see if they are disabled
    const user = await userModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    if (user.disabled) {
      return res.status(403).json({ 
        success: false, 
        message: "Your account has been disabled. Please contact administration." 
      });
    }

    // ✅ Attach user info to request
    req.userId = decoded.id;
    req.userRole = user.role || "guest"; // Use DB role for better accuracy
    req.userName = `${user.firstName} ${user.lastName}`;

    next();

  } catch (error) {
    console.error("User Auth Error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export default authUser;