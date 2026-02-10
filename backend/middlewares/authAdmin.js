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

    // ✅ CORRECT CHECK: role-based, not string comparison
    if (!decoded || decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not Authorized Login Again",
      });
    }

    // Attach admin info for later use
    req.admin = decoded;

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