import axios from "axios";
// IMPORTANT: Import your booking model here. Adjust the path as needed!
import bookingModel from "../models/bookingModel.js"; 

export const createCheckoutSession = async (req, res) => {
  try {
    const { bookingId } = req.body;

    // 1. Fetch the booking from the database to get the real price
    const booking = await bookingModel
      .findById(bookingId)
      .populate("user_id", "firstName middleName lastName suffix email");
    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    const amount = booking.total_price; 
    const description = "Your receipt from Mercedarian Retreat House";
    const user = booking.user_id;
    const customerName = user
      ? [user.firstName, user.middleName, user.lastName, user.suffix].filter(Boolean).join(" ")
      : "Guest";
    const customerEmail = user?.email || "guest@example.com";

    const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
    const FRONTEND_URL = process.env.FRONTEND_URL;
    if (!PAYMONGO_SECRET_KEY || !FRONTEND_URL) {
      return res.json({ success: false, message: "Payment configuration missing." });
    }

    const options = {
      method: "POST",
      url: "https://api.paymongo.com/v1/checkout_sessions",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY).toString("base64")}`,
      },
      data: {
        data: {
          attributes: {
            billing: {
              name: customerName,
              email: customerEmail,
            },
            line_items: [
              {
                currency: "PHP",
                amount: amount * 100, // Convert to Centavos
                description: `Booking reference: ${bookingId}`,
                name: "Mercedarian Retreat House",
                quantity: 1,
              },
            ],
            // Only GCash option
            payment_method_types: ["gcash"], 
            
            success_url: `${FRONTEND_URL}/my-bookings?success=true&bookingId=${bookingId}`,
            cancel_url: `${FRONTEND_URL}/my-bookings?canceled=true`,
            description: description,
          },
        },
      },
    };

    const response = await axios.request(options);

    res.json({
      success: true,
      checkoutUrl: response.data.data.attributes.checkout_url,
    });
  } catch (error) {
    const paymongoDetail = error.response?.data?.errors?.[0]?.detail;
    console.error("PayMongo Error:", error.response?.data || error.message);
    res.json({ success: false, message: paymongoDetail || error.response?.data?.message || error.message });
  }
};
