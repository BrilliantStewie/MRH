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
    grossBookingValue: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    approvedCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    pendingCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    declinedCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    cancelledCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    cancellationPendingCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    approvedBookings: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    paidBookings: {
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

  next();
});

reportSchema.index(
  { reportType: 1, periodYear: 1, periodMonth: 1 },
  { unique: true }
);

const Report =
  mongoose.models.Report || mongoose.model("Report", reportSchema);

export default Report;
