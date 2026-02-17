import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 👇 CHANGED: Made this field REQUIRED
    bookingName: { 
      type: String, 
      required: [true, "Please provide a booking name (e.g. Group Retreat)"], 
      trim: true   
    },
    
    room_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Room",
        required: true,
      },
    ],
    
    // Package Details
    package_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package", 
      default: null
    },
    package_details: { 
      type: Object, 
      default: {} 
    },

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

    reviewChat: [
      {
        senderRole: { 
          type: String, 
          enum: ["guest", "staff", "admin"], 
          required: true 
        },
        senderName: { type: String, required: true },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
  },
  { timestamps: true }
);

// ✅ Validation logic
bookingSchema.pre("save", function (next) {
  if (this.check_out <= this.check_in) {
    return next(new Error("Check-out must be after check-in"));
  }
  if (this.paymentStatus === "paid") {
      this.payment = true;
  }
  next();
});

const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

export default Booking;