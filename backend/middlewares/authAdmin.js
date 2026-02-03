import jwt from "jsonwebtoken";

// ✅ FIXED: Updated to read 'token' header to match AdminContext.jsx
const authAdmin = (req, res, next) => {
  try {
    const { token } = req.headers; // Was looking for 'authorization'

    if (!token) {
      return res.json({ success: false, message: "Not Authorized Login Again" });
    }

    const decoded_token = jwt.verify(token, process.env.JWT_SECRET);

    // Optional: Check if the token payload matches your specific admin signature
    if (decoded_token !== process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
        return res.json({ success: false, message: "Not Authorized Login Again" });
    }

    next();
  } catch (error) {
    console.log(error);
    return res.json({ success: false, message: "Invalid Admin Token" });
  }
};

export default authAdmin;