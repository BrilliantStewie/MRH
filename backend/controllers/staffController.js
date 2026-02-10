import Booking from "../models/bookingModel.js";

/* =========================
   STAFF – GET ALL BOOKINGS
========================= */
export const getStaffBookings = async (req, res) => {
  try {
    // We populate user_id with image and phone so they appear in the UI
    const bookings = await Booking.find()
      .populate("user_id", "name email image phone")
      .populate("room_ids", "name building room_type")
      .sort({ check_in: 1 }); 

    return res.status(200).json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("❌ Staff bookings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load bookings",
    });
  }
};