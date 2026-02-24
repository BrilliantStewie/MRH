import axios from "axios";
// IMPORTANT: Import your booking model here. Adjust the path as needed!
import bookingModel from "../models/bookingModel.js"; 

export const createCheckoutSession = async (req, res) => {
  try {
    const { bookingId } = req.body;

    // 1. Fetch the booking from the database to get the real price
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    const amount = booking.total_price; 
    const description = `Booking Payment: ${bookingId}`;

    const PAYMONGO_SECRET_KEY =
      process.env.PAYMONGO_SECRET_KEY || "sk_test_uNGuemjd7GCh5RuC8XwWmFaJ";

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
              name: "Guest User",
              email: "guest@example.com",
            },
            line_items: [
              {
                currency: "PHP",
                amount: amount * 100, // Convert to Centavos
                description: description,
                name: "Room Booking",
                quantity: 1,
              },
            ],
            // Only GCash option
            payment_method_types: ["gcash"], 
            
            // Note: You might want to make these URLs dynamic based on your frontend domain later
            success_url: `http://localhost:5173/my-bookings?success=true&bookingId=${bookingId}`,
            cancel_url: "http://localhost:5173/my-bookings?canceled=true",
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
    console.error("PayMongo Error:", error.response?.data || error.message);
    res.json({ success: false, message: error.message });
  }
};