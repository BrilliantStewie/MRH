import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const authAdmin = async (req, res, next) => {
  try {
    // 1. Extract token from various possible headers
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

    // 2. Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Define allowed roles for the Admin Panel
    const allowedRoles = ["admin", "staff"];
    
    if (!decoded || !allowedRoles.includes(decoded.role)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: You do not have the required permissions.",
      });
    }

    // 4. DATABASE CHECK: Ensure account is still active (Important for Staff)
    // We skip the DB check for the "Dummy Admin" ID (all zeros) defined in loginAdmin
    if (decoded.id !== "000000000000000000000000") {
      const user = await userModel.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({ success: false, message: "User account no longer exists." });
      }

      if (user.disabled) {
        return res.status(403).json({ 
          success: false, 
          message: "Your staff account has been disabled. Access denied." 
        });
      }
    }

    // 5. ATTACH DATA: Pass information to the next controller
    req.adminId = decoded.id;
    req.role = decoded.role; 
    
    // Fallback names for the UI/Chat logs
    req.adminName = decoded.name || (decoded.role === "admin" ? "Administrator" : "Staff Member"); 

    next();
  } catch (error) {
    console.error("Auth Admin Error:", error.message);

    // Handle specific JWT errors for clearer frontend feedback
    const msg = error.name === "TokenExpiredError" ? "Session Expired" : "Invalid Token";
    
    return res.status(401).json({
      success: false,
      message: msg,
    });
  }
};

export default authAdmin;