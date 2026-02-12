import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Must match the User model name exactly
      required: true,
    },
    room_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
        required: true,
      },
    ],
    check_in: { type: Date, required: true },
    check_out: { type: Date, required: true },
    participants: { type: Number, required: true, min: 1 },
    total_price: { type: Number, required: true, min: 0 },
    payment: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid"],
      default: "unpaid",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "gcash", "online", "n/a"],
      default: "n/a",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "declined",
        "cancelled",
        "cancellation_pending",
      ],
      default: "pending",
    },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    review: { type: String, default: "" },
  },
  { timestamps: true }
);

// ✅ Improved Validation logic
bookingSchema.pre("save", function (next) {
  // 1. Date Validation
  if (this.check_out <= this.check_in) {
    return next(new Error("Check-out must be after check-in"));
  }
  
  // 2. Sync Payment Status with Payment Boolean
  if (this.paymentStatus === "paid") {
      this.payment = true;
  }

  next();
});

const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

export default Booking;