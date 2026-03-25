import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reportType: {
      type: String,
      enum: ["monthly", "annual"],
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    periodMonth: {
      type: Number,
      min: 1,
      max: 12,
      default: null,
    },
    periodYear: {
      type: Number,
      required: true,
      min: 2000,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    bookingIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Booking",
        },
      ],
      default: [],
    },
    totalBookings: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalParticipants: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalRoomsBooked: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalIncome: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    collection: "reports",
    timestamps: true,
    versionKey: false,
  }
);

reportSchema.pre("validate", function handlePeriodMonth(next) {
  if (this.reportType === "annual") {
    this.periodMonth = null;
  }

  if (this.reportType === "monthly" && !this.periodMonth) {
    return next(new Error("periodMonth is required for monthly reports"));
  }

  if (Array.isArray(this.bookingIds)) {
    const seenBookingIds = new Set();
    this.bookingIds = this.bookingIds.filter((bookingId) => {
      if (!bookingId) return false;
      const bookingIdKey = String(bookingId);
      if (seenBookingIds.has(bookingIdKey)) return false;
      seenBookingIds.add(bookingIdKey);
      return true;
    });
  }

  next();
});

reportSchema.index(
  { reportType: 1, periodYear: 1, periodMonth: 1 },
  { unique: true }
);
reportSchema.index({ bookingIds: 1 });

const Report =
  mongoose.models.Report || mongoose.model("Report", reportSchema);

export default Report;
