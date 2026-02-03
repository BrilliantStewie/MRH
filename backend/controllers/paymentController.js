import axios from "axios";

export const createCheckoutSession = async (req, res) => {
  try {
    const { amount, description } = req.body;

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
                description: description || "Retreat Booking",
                name: "Room Booking",
                quantity: 1,
              },
            ],
            // --- CHANGE IS HERE: ONLY 'gcash' ---
            payment_method_types: ["gcash"], 
            
            success_url: "http://localhost:5173/my-profile",
            cancel_url: "http://localhost:5173/rooms",
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