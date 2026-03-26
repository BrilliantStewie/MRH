import mongoose from "mongoose";
import {
  MONTH_NAMES,
  getPeriodMonthIndex,
  normalizePeriodMonth,
} from "../utils/reportMonths.js";

const REPORT_FIELDS = [
  "reportType",
  "label",
  "periodMonth",
  "periodYear",
  "periodStart",
  "periodEnd",
  "bookingIds",
  "totalBookings",
  "totalParticipants",
  "totalRoomsBooked",
  "totalIncome",
];
const REPORT_UPDATE_HOOKS = ["findOneAndUpdate", "updateOne"];

const hasOwn = (value, key) =>
  Boolean(value) && Object.prototype.hasOwnProperty.call(value, key);

const isPlainObject = (value) =>
  Boolean(value) &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);

const isNil = (value) => value === null || value === undefined;

const normalizeReportType = (value) =>
  isNil(value) ? value : String(value).trim().toLowerCase();

const normalizeFiniteNumber = (value) => {
  if (isNil(value) || value === "") return value;

  const normalizedNumber = Number(value);
  return Number.isFinite(normalizedNumber) ? normalizedNumber : value;
};

const normalizeBookingIds = (bookingIds) => {
  if (!Array.isArray(bookingIds)) return bookingIds;

  const seenBookingIds = new Set();

  return bookingIds.filter((bookingId) => {
    if (!bookingId) return false;

    const bookingIdKey = String(bookingId);
    if (seenBookingIds.has(bookingIdKey)) return false;

    seenBookingIds.add(bookingIdKey);
    return true;
  });
};

const toDate = (value) => {
  if (isNil(value)) return null;

  const parsedDate = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const pickReportState = (value = {}) =>
  REPORT_FIELDS.reduce((state, field) => {
    const source =
      isPlainObject(value) ? value : isPlainObject(value?._doc) ? value._doc : value;

    if (hasOwn(source, field)) {
      state[field] = source[field];
    }

    return state;
  }, {});

const applyReportInvariants = (value = {}) => {
  const nextValue = { ...value };

  if (hasOwn(nextValue, "reportType")) {
    nextValue.reportType = normalizeReportType(nextValue.reportType);
  }

  if (hasOwn(nextValue, "bookingIds")) {
    nextValue.bookingIds = normalizeBookingIds(nextValue.bookingIds);
  }

  ["periodYear", "totalParticipants", "totalRoomsBooked", "totalIncome"].forEach(
    (field) => {
      if (hasOwn(nextValue, field)) {
        nextValue[field] = normalizeFiniteNumber(nextValue[field]);
      }
    }
  );

  if (hasOwn(nextValue, "periodMonth")) {
    nextValue.periodMonth = normalizePeriodMonth(nextValue.periodMonth);
  }

  if (nextValue.reportType === "annual") {
    nextValue.periodMonth = null;
  }

  if (Array.isArray(nextValue.bookingIds)) {
    nextValue.totalBookings = nextValue.bookingIds.length;
  }

  return nextValue;
};

const collectReportValidationIssues = (value = {}) => {
  const issues = [];
  const periodStart = toDate(value.periodStart);
  const periodEnd = toDate(value.periodEnd);

  if (value.reportType !== "monthly" && value.reportType !== "annual") {
    issues.push({
      path: "reportType",
      message: "reportType must be either monthly or annual",
      value: value.reportType,
    });
  }

  if (typeof value.label !== "string" || !value.label.trim()) {
    issues.push({
      path: "label",
      message: "label is required",
      value: value.label,
    });
  }

  if (!Array.isArray(value.bookingIds)) {
    issues.push({
      path: "bookingIds",
      message: "bookingIds must be an array",
      value: value.bookingIds,
    });
  }

  if (value.reportType === "monthly") {
    if (isNil(value.periodMonth)) {
      issues.push({
        path: "periodMonth",
        message: "periodMonth is required for monthly reports",
        value: value.periodMonth,
      });
    } else if (!getPeriodMonthIndex(value.periodMonth)) {
      issues.push({
        path: "periodMonth",
        message: "periodMonth must be a valid month name for monthly reports",
        value: value.periodMonth,
      });
    }
  }

  if (value.reportType === "annual" && !isNil(value.periodMonth)) {
    issues.push({
      path: "periodMonth",
      message: "periodMonth must be null for annual reports",
      value: value.periodMonth,
    });
  }

  if (!Number.isInteger(value.periodYear) || value.periodYear < 2000) {
    issues.push({
      path: "periodYear",
      message: "periodYear must be an integer greater than or equal to 2000",
      value: value.periodYear,
    });
  }

  if (!periodStart) {
    issues.push({
      path: "periodStart",
      message: "periodStart is required and must be a valid date",
      value: value.periodStart,
    });
  }

  if (!periodEnd) {
    issues.push({
      path: "periodEnd",
      message: "periodEnd is required and must be a valid date",
      value: value.periodEnd,
    });
  }

  if (periodStart && periodEnd && periodEnd < periodStart) {
    issues.push({
      path: "periodEnd",
      message: "periodEnd must be greater than or equal to periodStart",
      value: value.periodEnd,
    });
  }

  if (!Number.isInteger(value.totalBookings) || value.totalBookings < 0) {
    issues.push({
      path: "totalBookings",
      message: "totalBookings must be a non-negative integer",
      value: value.totalBookings,
    });
  }

  if (Array.isArray(value.bookingIds) && value.totalBookings !== value.bookingIds.length) {
    issues.push({
      path: "totalBookings",
      message: "totalBookings must match the number of bookingIds",
      value: value.totalBookings,
    });
  }

  if (!Number.isInteger(value.totalParticipants) || value.totalParticipants < 0) {
    issues.push({
      path: "totalParticipants",
      message: "totalParticipants must be a non-negative integer",
      value: value.totalParticipants,
    });
  }

  if (!Number.isInteger(value.totalRoomsBooked) || value.totalRoomsBooked < 0) {
    issues.push({
      path: "totalRoomsBooked",
      message: "totalRoomsBooked must be a non-negative integer",
      value: value.totalRoomsBooked,
    });
  }

  if (typeof value.totalIncome !== "number" || !Number.isFinite(value.totalIncome) || value.totalIncome < 0) {
    issues.push({
      path: "totalIncome",
      message: "totalIncome must be a non-negative number",
      value: value.totalIncome,
    });
  }

  return issues;
};

const createValidationError = (issues) => {
  const error = new mongoose.Error.ValidationError();

  issues.forEach(({ path, message, value }) => {
    error.addError(
      path,
      new mongoose.Error.ValidatorError({
        path,
        message,
        value,
      })
    );
  });

  return error;
};

const validateReportState = (value) => {
  const issues = collectReportValidationIssues(value);

  if (issues.length > 0) {
    throw createValidationError(issues);
  }
};

const isOperatorUpdate = (update) =>
  isPlainObject(update) &&
  Object.keys(update).some((key) => key.startsWith("$"));

const buildCandidateState = ({ existingReport, filter, update }) => {
  const candidateState = {
    ...pickReportState(existingReport),
    ...pickReportState(filter),
  };

  if (!isPlainObject(update)) {
    return candidateState;
  }

  if (isOperatorUpdate(update)) {
    Object.assign(candidateState, pickReportState(update.$setOnInsert));
    Object.assign(candidateState, pickReportState(update.$set));

    if (isPlainObject(update.$unset)) {
      REPORT_FIELDS.forEach((field) => {
        if (hasOwn(update.$unset, field)) {
          delete candidateState[field];
        }
      });
    }

    return candidateState;
  }

  return {
    ...candidateState,
    ...pickReportState(update),
  };
};

const buildNormalizedUpdate = (update, normalizedState) => {
  const reportState = pickReportState(normalizedState);

  if (!isOperatorUpdate(update)) {
    return reportState;
  }

  const nextUpdate = {
    ...update,
    $set: {
      ...(isPlainObject(update.$set) ? update.$set : {}),
      ...reportState,
    },
  };

  if (isPlainObject(nextUpdate.$unset)) {
    const nextUnset = { ...nextUpdate.$unset };

    REPORT_FIELDS.forEach((field) => {
      delete nextUnset[field];
    });

    if (Object.keys(nextUnset).length === 0) {
      delete nextUpdate.$unset;
    } else {
      nextUpdate.$unset = nextUnset;
    }
  }

  if (isPlainObject(nextUpdate.$setOnInsert)) {
    const nextSetOnInsert = { ...nextUpdate.$setOnInsert };

    REPORT_FIELDS.forEach((field) => {
      delete nextSetOnInsert[field];
    });

    if (Object.keys(nextSetOnInsert).length === 0) {
      delete nextUpdate.$setOnInsert;
    } else {
      nextUpdate.$setOnInsert = nextSetOnInsert;
    }
  }

  return nextUpdate;
};

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
      type: String,
      enum: MONTH_NAMES,
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

reportSchema.pre("validate", function validateReportDocument(next) {
  try {
    const normalizedState = applyReportInvariants(pickReportState(this));

    REPORT_FIELDS.forEach((field) => {
      if (hasOwn(normalizedState, field)) {
        this.set(field, normalizedState[field]);
      }
    });

    validateReportState(pickReportState(this));
    next();
  } catch (error) {
    next(error);
  }
});

REPORT_UPDATE_HOOKS.forEach((hook) => {
  reportSchema.pre(hook, async function validateReportUpdate(next) {
    try {
      const update = this.getUpdate();

      if (Array.isArray(update)) {
        throw new Error("Pipeline updates are not supported for reports");
      }

      const filter = this.getFilter() || {};
      const existingReport = await this.model
        .findOne(filter)
        .select(REPORT_FIELDS.join(" "))
        .lean();

      if (!existingReport && !this.getOptions().upsert) {
        return next();
      }

      const candidateState = buildCandidateState({
        existingReport,
        filter,
        update,
      });
      const normalizedState = applyReportInvariants(candidateState);

      validateReportState(normalizedState);
      this.setUpdate(buildNormalizedUpdate(update, normalizedState));
      next();
    } catch (error) {
      next(error);
    }
  });
});

reportSchema.index(
  { reportType: 1, periodYear: 1, periodMonth: 1 },
  { unique: true }
);
reportSchema.index({ bookingIds: 1 });

const Report =
  mongoose.models.Report || mongoose.model("Report", reportSchema);

export default Report;
