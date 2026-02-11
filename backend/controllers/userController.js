import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import axios from "axios"; 
import userModel from "../models/userModel.js";
import bookingModel from "../models/bookingModel.js";
import cloudinary from "../config/cloudinary.js"; 

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// --- HELPER: Stream Upload ---
const streamUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(fileBuffer);
  });
};

// --- AUTHENTICATION ---
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) return res.json({ success: false, message: "Missing details" });
    if (!validator.isEmail(email)) return res.json({ success: false, message: "Invalid email" });
    if (password.length < 8) return res.json({ success: false, message: "Password too short" });

    const exists = await userModel.findOne({ email });
    if (exists) return res.json({ success: false, message: "User already exists" });

    let imageUrl = "";
    if (req.file) {
      const result = await streamUpload(req.file.buffer);
      imageUrl = result.secure_url;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({ name, email, password: hashedPassword, phone, image: imageUrl });
    const user = await newUser.save();
    const token = createToken(user._id);
    res.json({ success: true, token });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) return res.json({ success: false, message: "User does not exist" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const token = createToken(user._id);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getUserData = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId; 
    const userData = await userModel.findById(userId).select("-password");
    res.json({ success: true, userData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    // ✅ ADDED: removeImage parameter
    const { name, phone, email, oldPassword, newPassword, removeImage } = req.body;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // ---- BASIC INFO UPDATE ----
    if (name) user.name = name;
    if (phone) user.phone = phone;

    // ---- EMAIL UPDATE ----
    if (email && email !== user.email) {
      if (!validator.isEmail(email)) return res.json({ success: false, message: "Invalid email format" });
      const emailExists = await userModel.findOne({ email });
      if (emailExists && emailExists._id.toString() !== userId.toString()) {
        return res.json({ success: false, message: "Email already in use" });
      }
      user.email = email;
    }

    // ---- PASSWORD CHANGE ----
    if (newPassword) {
      if (!oldPassword) return res.json({ success: false, message: "Current password is required" });
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) return res.json({ success: false, message: "Current password is incorrect" });
      if (newPassword.length < 8) return res.json({ success: false, message: "Password must be at least 8 characters" });
      
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // ---- IMAGE LOGIC ----
    // 1. Remove Image if requested
    if (removeImage === 'true' || removeImage === true) {
        user.image = ""; 
    }

    // 2. Upload New Image (Overrides removal if both are sent)
    if (req.file) {
      const result = await streamUpload(req.file.buffer);
      user.image = result.secure_url;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      userData: {
        name: user.name,
        phone: user.phone,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};


// --- BOOKING LOGIC ---
const createBooking = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    const { roomId, checkIn, checkOut, participants, totalPrice } = req.body;
    
    const bookingData = {
      user_id: userId,
      room_ids: [roomId],
      check_in: new Date(checkIn),
      check_out: new Date(checkOut),
      participants,
      total_price: totalPrice,
      payment: false,
      paymentStatus: 'unpaid',
      paymentMethod: 'n/a'
    };

    const newBooking = new bookingModel(bookingData);
    await newBooking.save();
    res.json({ success: true, message: "Booking Created" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    const bookings = await bookingModel.find({ user_id: userId }).populate("room_ids").sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;
    await bookingModel.findByIdAndUpdate(bookingId, { status: "cancelled" });
    res.json({ success: true, message: "Booking Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// --- PAYMENT LOGIC ---
const createCheckoutSession = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await bookingModel.findById(bookingId).populate("room_ids");
    if (!booking) return res.json({ success: false, message: "Booking not found" });

    const payload = {
      data: {
        attributes: {
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          description: `Booking for ${booking.room_ids[0]?.name}`,
          line_items: [{
              currency: 'PHP',
              amount: booking.total_price * 100,
              description: 'Room Reservation',
              name: booking.room_ids[0]?.name || 'Room Booking',
              quantity: 1
          }],
          payment_method_types: ['gcash', 'card', 'paymaya', 'grab_pay'],
          reference_number: booking._id.toString(),
          success_url: `${process.env.FRONTEND_URL}/my-bookings?success=true&bookingId=${bookingId}`,
          cancel_url: `${process.env.FRONTEND_URL}/my-bookings?canceled=true`
        }
      }
    };

    const response = await axios.post('https://api.paymongo.com/v1/checkout_sessions', payload, {
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
          authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY).toString('base64')}`
        }
    });

    res.json({ success: true, checkoutUrl: response.data.data.attributes.checkout_url });
  } catch (error) {
    res.json({ success: false, message: "Payment initialization failed" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    await bookingModel.findByIdAndUpdate(bookingId, { 
        payment: true, 
        paymentStatus: 'paid', 
        paymentMethod: 'online' 
    });
    res.json({ success: true, message: "Payment Verified" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

const markCashPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        await bookingModel.findByIdAndUpdate(bookingId, { paymentMethod: 'cash' });
        res.json({ success: true, message: "Marked as Pay Now (Cash)" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const confirmCashPayment = async (req, res) => {
    try {
        const { bookingId } = req.body;
        await bookingModel.findByIdAndUpdate(bookingId, { 
            payment: true,
            paymentStatus: 'paid' 
        });
        res.json({ success: true, message: "Payment Confirmed by Admin" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const rateBooking = async (req, res) => {
    try {
        const { bookingId, rating, review } = req.body;
        await bookingModel.findByIdAndUpdate(bookingId, { rating, review });
        res.json({ success: true, message: "Thank you for your feedback!" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export {
  registerUser, loginUser, getUserData, updateUserProfile,
  getUserBookings, createBooking, cancelBooking,
  createCheckoutSession, verifyPayment, markCashPayment, confirmCashPayment, rateBooking
};