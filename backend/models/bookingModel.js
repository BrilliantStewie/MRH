import mongoose from "mongoose";

const bookingItemSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },

    participants: {
      type: Number,
      required: true,
      min: 1,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    bookingName: {
      type: String,
      required: [true, "Please provide a booking name (e.g. Group Retreat)"],
      trim: true,
    },

    bookingItems: {
      type: [bookingItemSchema],
      required: true,
      default: [],
    },

    extraPackages: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Package",
        },
      ],
      default: [],
    },

    venueParticipants: {
      type: Number,
      default: 0,
      min: 0,
    },

    checkIn: {
      type: Date,
      required: true,
    },

    checkOut: {
      type: Date,
      required: true,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "declined", "cancelled", "cancellation_pending"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid"],
      default: "unpaid",
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "gcash"],
      default: null,
    },

    payment: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bookingSchema.pre("validate", function (next) {
  if (this.paymentMethod && !["cash", "gcash"].includes(this.paymentMethod)) {
    this.paymentMethod = undefined;
  }

  this.payment = this.paymentStatus === "paid";
  next();
});

bookingSchema.pre("save", function (next) {
  if (this.checkOut < this.checkIn) {
    return next(new Error("Check-out must be after check-in"));
  }

  if (
    this.checkOut.getTime() === this.checkIn.getTime() &&
    Array.isArray(this.bookingItems) &&
    this.bookingItems.length > 0
  ) {
    return next(new Error("Rooms are not available for same-day bookings"));
  }

  if (
    (!Array.isArray(this.bookingItems) || this.bookingItems.length === 0) &&
    (!this.venueParticipants || this.venueParticipants <= 0)
  ) {
    return next(new Error("Booking must include rooms or venue participants"));
  }

  next();
});

const Booking =
  mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);

export default Booking;
