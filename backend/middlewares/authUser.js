import jwt from "jsonwebtoken";

const authUser = (req, res, next) => {
  try {
    // Allows token to be passed as just "token" or as a standard "Bearer" token
    const token = req.headers.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🛠️ DEBUGGING LOG: Check your backend terminal to see what is actually inside your token!
    console.log("Decoded Token Payload:", decoded); 

    // ✅ Attach user ID
    req.userId = decoded.id;

    // ✅ Attach user role from token (Defaults to guest if missing)
    req.userRole = decoded.role || "guest";

    // ✅ Attach name (optional)
    req.userName = decoded.name || "Guest";

    next();

  } catch (error) {
    console.error("User Auth Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
};

export default authUser;