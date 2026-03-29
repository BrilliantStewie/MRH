import mongoose from "mongoose";
import { getBookingStayFlags } from "../utils/bookingStay.js";
import { coerceBookingDateValue } from "../utils/bookingDateFields.js";

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

    roomGuests: {
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

    status: {
      type: String,
      enum: ["pending", "approved", "declined", "cancelled", "cancellation_pending"],
      default: "pending",
    },

    checkInDate: {
      type: Date,
      required: true,
    },

    checkOutDate: {
      type: Date,
      required: true,
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

    participants: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "gcash"],
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "paid"],
      default: "unpaid",
    },

    payment: {
      type: Boolean,
      default: false,
    },

    checkIn: {
      type: Boolean,
      default: false,
      set(value) {
        const legacyDate = coerceBookingDateValue(value);
        if (legacyDate && !this.checkInDate) {
          this.checkInDate = legacyDate;
          return false;
        }

        return Boolean(value);
      },
    },

    checkOut: {
      type: Boolean,
      default: false,
      set(value) {
        const legacyDate = coerceBookingDateValue(value);
        if (legacyDate && !this.checkOutDate) {
          this.checkOutDate = legacyDate;
          return false;
        }

        return Boolean(value);
      },
    },

    noShow: {
      type: Boolean,
      default: false,
    },

    checkInConfirmedAt: {
      type: Date,
      default: null,
    },

    checkInConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    checkOutConfirmedAt: {
      type: Date,
      default: null,
    },

    checkOutConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

  const legacyCheckInDate = coerceBookingDateValue(this.checkIn);
  const legacyCheckOutDate = coerceBookingDateValue(this.checkOut);

  if (!this.checkInDate && legacyCheckInDate) {
    this.checkInDate = legacyCheckInDate;
  }

  if (!this.checkOutDate && legacyCheckOutDate) {
    this.checkOutDate = legacyCheckOutDate;
  }

  const legacyFlags = getBookingStayFlags(this);

  if (!this.isModified("checkIn") && legacyFlags.checkIn) {
    this.checkIn = true;
  }

  if (!this.isModified("checkOut") && legacyFlags.checkOut) {
    this.checkOut = true;
  }

  if (!this.isModified("noShow") && legacyFlags.noShow) {
    this.noShow = true;
  }

  if (this.noShow) {
    this.checkIn = false;
    this.checkOut = false;
    this.checkOutConfirmedAt = null;
    this.checkOutConfirmedBy = null;
  } else if (!this.checkIn) {
    this.checkOut = false;
    this.checkInConfirmedAt = null;
    this.checkInConfirmedBy = null;
    this.checkOutConfirmedAt = null;
    this.checkOutConfirmedBy = null;
  } else if (!this.checkOut) {
    this.checkOutConfirmedAt = null;
    this.checkOutConfirmedBy = null;
  }

  if (this.checkOut && !this.checkIn) {
    return next(new Error("Cannot confirm check-out before check-in"));
  }

  this.payment = this.paymentStatus === "paid";
  next();
});

bookingSchema.pre("save", function (next) {
  if (this.checkOutDate < this.checkInDate) {
    return next(new Error("Check-out must be after check-in"));
  }

  if (
    this.checkOutDate.getTime() === this.checkInDate.getTime() &&
    Array.isArray(this.bookingItems) &&
    this.bookingItems.length > 0
  ) {
    return next(new Error("Rooms are not available for same-day bookings"));
  }

  if (
    (!Array.isArray(this.bookingItems) || this.bookingItems.length === 0) &&
    (!this.participants || this.participants <= 0)
  ) {
    return next(new Error("Booking must include rooms or participants"));
  }

  next();
});

const Booking =
  mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);

export default Booking;
