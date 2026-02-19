import jwt from "jsonwebtoken";

const authUser = (req, res, next) => {
  try {
    const token = req.headers.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Attach user ID
    req.userId = decoded.id;

    // ✅ Attach user role from token
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
