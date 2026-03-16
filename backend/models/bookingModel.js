import mongoose from "mongoose";

/* =========================================
   BOOKING ITEM SCHEMA
   Each room + package combination
========================================= */
const bookingItemSchema = new mongoose.Schema({

  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true
  },

  package_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Package",
    required: true
  },

  participants: {
    type: Number,
    required: true,
    min: 1
  },

  subtotal: {
    type: Number,
    required: true,
    min: 0
  }

}, { _id: false });


/* =========================================
   MAIN BOOKING SCHEMA
========================================= */
const bookingSchema = new mongoose.Schema({

  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  bookingName: {
    type: String,
    required: [true, "Please provide a booking name (e.g. Group Retreat)"],
    trim: true
  },

  // ⭐ MULTIPLE ROOMS + PACKAGES
  bookingItems: {
    type: [bookingItemSchema],
    required: true
  },

  extra_packages: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package"
    }
  ],

  venueParticipants: {
    type: Number,
    default: 0,
    min: 0
  },

  check_in: {
    type: Date,
    required: true
  },

  check_out: {
    type: Date,
    required: true
  },

  total_price: {
    type: Number,
    required: true,
    min: 0
  },

  status: {
    type: String,
    enum: [
      "pending",
      "approved",
      "declined",
      "cancelled",
      "cancellation_pending"
    ],
    default: "pending"
  },

  paymentStatus: {
    type: String,
    enum: ["unpaid", "pending", "paid"],
    default: "unpaid"
  },

  paymentMethod: {
    type: String,
    enum: ["cash", "gcash"]
  },

  payment: {
    type: Boolean,
    default: false
  },

  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },

  review: {
    type: String,
    default: ""
  },

  // ⭐ REVIEW CHAT SYSTEM
  reviewChat: [
    {
      senderRole: {
        type: String,
        enum: ["guest", "staff", "admin"],
        required: true
      },

      senderName: {
        type: String,
        required: true
      },

      message: {
        type: String,
        required: true
      },

      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]

}, { timestamps: true });


/* =========================================
   VALIDATIONS BEFORE SAVE
========================================= */
bookingSchema.pre("validate", function (next) {
  if (this.paymentMethod && !["cash", "gcash"].includes(this.paymentMethod)) {
    this.paymentMethod = undefined;
  }
  next();
});

bookingSchema.pre("save", function (next) {

  // Check date validity
  if (this.check_out < this.check_in) {
    return next(new Error("Check-out must be after check-in"));
  }

  if (this.check_out.getTime() === this.check_in.getTime() && this.bookingItems && this.bookingItems.length > 0) {
    return next(new Error("Rooms are not available for same-day bookings"));
  }

  // Booking must contain rooms or venue participants
  if ((!this.bookingItems || this.bookingItems.length === 0) && (!this.venueParticipants || this.venueParticipants <= 0)) {
    return next(new Error("Booking must include rooms or venue participants"));
  }

  // Auto set payment flag
  if (this.paymentStatus === "paid") {
    this.payment = true;
  }

  next();
});


/* =========================================
   MODEL EXPORT
========================================= */
const Booking =
  mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);

export default Booking;
