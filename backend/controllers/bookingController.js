import bookingModel from "../models/bookingModel.js";
import Notification from "../models/notificationModel.js";
import axios from "axios";

/* ===================================================================
   HELPER: Normalize Date (midnight)
=================================================================== */
const normalizeDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/* ===================================================================
   1. CREATE BOOKING (DOUBLE BOOKING PROTECTED)
=================================================================== */
export const createBooking = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      bookingName,
      room_ids = [],
      check_in,
      check_out,
      participants,
      package_id,
      package_details,
      total_price,
    } = req.body;

    const start = normalizeDate(check_in);
    const end = normalizeDate(check_out);
    const today = normalizeDate(new Date());

    if (start < today)
      return res.json({ success: false, message: "Past dates not allowed" });

    if (end <= start)
      return res.json({ success: false, message: "Invalid date range" });

    const conflict = await bookingModel.findOne({
      room_ids: { $in: room_ids },
      status: "approved",
      check_in: { $lt: end },
      check_out: { $gt: start },
    });

    if (conflict)
      return res.json({
        success: false,
        message: "Selected dates are already booked",
      });

    const booking = await bookingModel.create({
      user_id: userId,
      bookingName,
      room_ids,
      check_in: start,
      check_out: end,
      participants,
      package_id,
      package_details,
      total_price,
      status: "pending",
      payment: false,
      paymentStatus: "unpaid",
      paymentMethod: "n/a",
    });

    // 🔔 NOTIFY ADMIN (VERY IMPORTANT FIX)
    const admins = await bookingModel.db.model("User").find({ role: "admin" });

  
      const adminNotifications = admins.map((admin) => ({
  recipient: admin._id,
  sender: userId, // The guest who booked
  type: "booking_update",
  message: `New booking request: ${bookingName}`,
  link: "/admin/bookings", // Or wherever your admin dashboard is
  isRead: false
}));

   if (adminNotifications.length > 0) {
  await Notification.insertMany(adminNotifications);
}

    res.json({ success: true, message: "Booking Created successfully" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ===================================================================
   2. ADMIN: UPDATE BOOKING STATUS (Approve, Decline, Cancel)
=================================================================== */
export const updateBookingStatus = async (req, res) => {
  try {
    const { bookingId, status } = req.body; 

    const booking = await bookingModel.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    // 🔔 NOTIFY USER: Decision by Admin (Approved, Declined, or Cancelled)
    let msg = status === "approved" 
      ? `Great news! Your booking for ${booking.bookingName} has been APPROVED.` 
      : `Your booking for ${booking.bookingName} was ${status.toUpperCase()} by the administration.`;

    await Notification.create({
  recipient: booking.user_id,
  type: "booking_update",
  message: msg,
  link: "/my-bookings",
  isRead: false
});

    res.json({ success: true, message: `Booking ${status}` });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ===================================================================
   3. USER BOOKINGS
=================================================================== */
export const userBookings = async (req, res) => {
  try {
    const bookings = await bookingModel
      .find({ user_id: req.userId })
      .populate("room_ids")
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ===================================================================
   4. CANCEL BOOKING (By User)
=================================================================== */
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await bookingModel.findById(bookingId);

    if (!booking)
      return res.json({ success: false, message: "Booking not found" });

    if (booking.user_id.toString() !== req.userId)
      return res.json({ success: false, message: "Unauthorized" });

    if (booking.status === "pending") booking.status = "cancelled";
    else if (booking.status === "approved")
      booking.status = "cancellation_pending";
    else
      return res.json({
        success: false,
        message: "Booking cannot be cancelled",
      });

    await booking.save();

    // 🔔 NOTIFICATION: Cancellation Status Receipt
    await Notification.create({
  recipient: booking.user_id,
  type: "booking_update",
  message: `The status of your booking ${booking.bookingName} is now ${booking.status.replace('_',' ')}.`,
  link: "/my-bookings",
  isRead: false
});

    res.json({ success: true, message: "Cancellation processed" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ===================================================================
   5. MARK CASH PAYMENT
=================================================================== */
export const markCash = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await bookingModel.findByIdAndUpdate(
      bookingId,
      {
        paymentMethod: "cash",
        paymentStatus: "pending",
        payment: false,
      },
      { new: true }
    );

    if (!booking)
      return res.json({ success: false, message: "Booking not found" });

    res.json({
      success: true,
      message: "Marked as Pay Over the Counter",
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ===================================================================
   6. VERIFY PAYMENT
=================================================================== */
export const verifyPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await bookingModel.findByIdAndUpdate(
      bookingId,
      {
        payment: true,
        paymentStatus: "paid",
        paymentMethod: "gcash",
      },
      { new: true }
    );

    if (!booking) return res.json({ success: false, message: "Booking not found" });

    // 🔔 NOTIFICATION: Payment Confirmed
    await Notification.create({
  recipient: booking.user_id,
  type: "payment_update",
  message: `Payment verified for ${booking.bookingName}. Your stay is confirmed!`,
  link: "/my-bookings",
  isRead: false
});

    res.json({ success: true, message: "Payment verified" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ===================================================================
   7. PAYMONGO CHECKOUT SESSION
=================================================================== */
export const createCheckoutSession = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await bookingModel
      .findById(bookingId)
      .populate("room_ids");

    if (!booking)
      return res.json({ success: false, message: "Booking not found" });

    if (booking.status !== "approved")
      return res.json({ success: false, message: "Booking not approved" });

    if (booking.payment)
      return res.json({ success: false, message: "Already paid" });

    booking.paymentMethod = "gcash";
    booking.paymentStatus = "pending";
    booking.payment = false;
    await booking.save();

    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        data: {
          attributes: {
            line_items: [
              {
                currency: "PHP",
                amount: booking.total_price * 100,
                name: booking.room_ids[0]?.name || "Retreat Booking",
                quantity: 1,
              },
            ],
            payment_method_types: ["gcash"],
            success_url: `${process.env.FRONTEND_URL}/my-bookings?success=true&bookingId=${booking._id}`,
            cancel_url: `${process.env.FRONTEND_URL}/my-bookings?success=false&bookingId=${booking._id}`,
          },
        },
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            process.env.PAYMONGO_SECRET_KEY
          ).toString("base64")}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      success: true,
      checkoutUrl: response.data.data.attributes.checkout_url,
    });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Payment initialization failed" });
  }
};

/* ===================================================================
   8. RATE BOOKING (Initial Review)
=================================================================== */
export const rateBooking = async (req, res) => {
  try {
    const { bookingId, rating, review } = req.body;
    const name = req.userName || "Guest";

    const initialMessage = {
      senderRole: "guest",
      senderName: name,
      message: review,
      createdAt: new Date(),
    };

    const booking = await bookingModel.findByIdAndUpdate(
      bookingId,
      {
        rating,
        review,
        $push: { reviewChat: initialMessage },
      },
      { new: true }
    );

    if (!booking)
      return res.json({ success: false, message: "Booking not found" });

    res.json({
      success: true,
      message: "Review submitted",
      reviewChat: booking.reviewChat,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ===================================================================
   9. ADD REVIEW CHAT MESSAGE (Staff/Admin Reply)
=================================================================== */
export const addReviewChat = async (req, res) => {
  try {
    const { bookingId, message } = req.body;
    const role = req.userRole || "staff"; 
    const name = req.userName || "Staff";

    if (!message || message.trim() === "") {
      return res.json({ success: false, message: "Message cannot be empty" });
    }

    const newMessage = {
      senderRole: role,
      senderName: name,
      message: message,
      createdAt: new Date(),
    };

    const booking = await bookingModel.findByIdAndUpdate(
      bookingId,
      { $push: { reviewChat: newMessage } },
      { new: true }
    );

    if (!booking)
      return res.json({ success: false, message: "Booking not found" });

    // 🔔 NOTIFICATION: Notify guest if staff/admin replies
    if (role !== "guest") {
      await Notification.create({
  recipient: booking.user_id,
  type: "new_reply",
  message: `Management has replied to your review/chat for ${booking.bookingName}.`,
  link: "/my-bookings",
  isRead: false
});
    }

    res.json({
      success: true,
      message: "Message added",
      reviewChat: booking.reviewChat,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ===================================================================
   10. CHECK AVAILABILITY
=================================================================== */
export const checkAvailability = async (req, res) => {
  try {
    const { roomIds = [], checkIn, checkOut } = req.body;

    const start = normalizeDate(checkIn);
    const end = normalizeDate(checkOut);

    const conflict = await bookingModel.findOne({
      room_ids: { $in: roomIds },
      status: "approved",
      check_in: { $lt: end },
      check_out: { $gt: start },
    });

    if (conflict) {
      return res.json({ success: false, message: "Rooms are unavailable for selected dates" });
    }

    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ===================================================================
   11. GET UNAVAILABLE DATES
=================================================================== */
export const getUnavailableDates = async (req, res) => {
  try {
    const { roomIds = [] } = req.body;

    const bookings = await bookingModel.find({
      room_ids: { $in: roomIds },
      status: "approved",
    });

    const blockedDates = [];

    bookings.forEach((b) => {
      let cur = normalizeDate(b.check_in);
      const end = normalizeDate(b.check_out);
      while (cur < end) {
        blockedDates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
    });

    res.json({ success: true, blockedDates });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ===================================================================
   12. USER BOOKED DATES
=================================================================== */
export const getUserBookedDates = async (req, res) => {
  try {
    const bookings = await bookingModel.find({
      user_id: req.userId,
      status: "approved",
    });

    const dates = [];

    bookings.forEach((b) => {
      let cur = normalizeDate(b.check_in);
      const end = normalizeDate(b.check_out);
      while (cur < end) {
        dates.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
    });

    res.json({ success: true, userBusyDates: dates });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ===================================================================
   13. GET OCCUPIED ROOMS (TODAY)
=================================================================== */
export const getOccupiedRooms = async (req, res) => {
  try {
    const today = normalizeDate(new Date());

    const bookings = await bookingModel.find({
      status: "approved",
      check_in: { $lte: today },
      check_out: { $gt: today },
    });

    const occupiedRoomIds = bookings.flatMap((b) => b.room_ids);

    res.json({ success: true, occupiedRoomIds });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};