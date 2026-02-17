import jwt from "jsonwebtoken";

const authUser = (req, res, next) => {
  try {
    const token = req.headers.token;
    if (!token) {
      return res.json({ success: false, message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 1. Standard identification
    req.userId = decoded.id; 

    // 2. ✅ ATTACH DATA FOR THE CHAT CONTROLLER
    // This tells the bookingController exactly who is replying
    req.role = "guest"; 
    
    // Ensure 'name' was included in your JWT payload during login/register
    req.userName = decoded.name || "Guest"; 

    next();
  } catch (error) {
    console.error("User Auth Error:", error.message);
    return res.json({ success: false, message: "Invalid token" });
  }
};

export default authUser;