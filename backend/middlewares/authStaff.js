import jwt from "jsonwebtoken";

const authStaff = (req, res, next) => {
  try {
    const token =
      req.headers.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not Authorized",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "staff") {
      return res.status(403).json({
        success: false,
        message: "Staff access only",
      });
    }

    req.staff = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired",
    });
  }
};

export default authStaff;
