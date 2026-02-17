import jwt from "jsonwebtoken";

const authAdmin = (req, res, next) => {
  try {
    // Accept token from multiple safe locations
    const token =
      req.headers.token ||
      req.headers.atoken ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized Login Again",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ role-based check
    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not Authorized Login Again",
      });
    }

    // ✅ ATTACH DATA FOR CHAT & OTHER CONTROLLERS
    // We attach these so the bookingController knows who is "talking"
    req.admin = decoded;
    req.role = decoded.role; // This will be "admin"
    
    // Use the name from the token if available, otherwise fallback to "Admin"
    req.adminName = decoded.name || "Administrator"; 

    next();
  } catch (error) {
    console.error("Admin Auth Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Session Expired",
    });
  }
};

export default authAdmin;