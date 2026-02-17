import jwt from "jsonwebtoken";

// This checks if a user is logged in
export const verifyUser = (req, res, next) => {
  const token = req.headers.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "Not Authorized. Please login again." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next(); 
  } catch (err) {
    return res.status(403).json({ success: false, message: "Invalid Token" });
  }
};

// This checks if the user is an Admin
export const verifyAdmin = (req, res, next) => {
  verifyUser(req, res, () => {
    if (req.user.role === "admin") {
      next();
    } else {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }
  });
};