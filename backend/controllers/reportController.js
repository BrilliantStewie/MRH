import bookingModel from "../models/bookingModel.js";
import reportModel from "../models/reportModel.js";
import roomModel from "../models/roomModel.js";
import userModel from "../models/userModel.js";
import {
  BOOKING_DATE_SELECT,
  buildLegacyBookingDateRangeQuery,
  getBookingCheckInDate,
} from "../utils/bookingDateFields.js";
import {
  MONTH_NAMES,
  comparePeriodMonthsDesc,
  getPeriodMonthIndex,
  normalizePeriodMonth,
} from "../utils/reportMonths.js";

const MANILA_START_HOUR_UTC = -8;
const MANILA_END_HOUR_UTC = 15;
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const normalizeReportType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase() === "annual"
    ? "annual"
    : "monthly";

const toInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const createManilaBoundary = ({
  year,
  monthIndex,
  day,
  endOfDay = false,
}) =>
  new Date(
    Date.UTC(
      year,
      monthIndex,
      day,
      endOfDay ? MANILA_END_HOUR_UTC : MANILA_START_HOUR_UTC,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    )
  );

const getPeriodWindow = (reportType, periodYear, periodMonth = null) => {
  if (reportType === "monthly") {
    const normalizedPeriodMonth = normalizePeriodMonth(periodMonth);
    const monthNumber = getPeriodMonthIndex(normalizedPeriodMonth);

    if (!normalizedPeriodMonth || !monthNumber) {
      throw new Error("periodMonth must be a valid month name for monthly reports");
    }

    const monthIndex = monthNumber - 1;
    const lastDay = new Date(periodYear, monthNumber, 0).getDate();

    return {
      label: `${normalizedPeriodMonth} ${periodYear}`,
      periodMonth: normalizedPeriodMonth,
      periodYear,
      periodStart: createManilaBoundary({
        year: periodYear,
        monthIndex,
        day: 1,
      }),
      periodEnd: createManilaBoundary({
        year: periodYear,
        monthIndex,
        day: lastDay,
        endOfDay: true,
      }),
    };
  }

  return {
    label: `Annual ${periodYear}`,
    periodMonth: null,
    periodYear,
    periodStart: createManilaBoundary({
      year: periodYear,
      monthIndex: 0,
      day: 1,
    }),
    periodEnd: createManilaBoundary({
      year: periodYear,
      monthIndex: 11,
      day: 31,
      endOfDay: true,
    }),
  };
};

const getBookingReferenceDate = (booking) => {
  return getBookingCheckInDate(booking);
};

const getManilaDateParts = (value) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return null;

  const manilaDate = new Date(parsed.getTime() + MANILA_OFFSET_MS);

  return {
    year: manilaDate.getUTCFullYear(),
    monthIndex: manilaDate.getUTCMonth(),
    day: manilaDate.getUTCDate(),
  };
};

const getBookingParticipants = (booking) => {
  const roomGuests = Array.isArray(booking?.bookingItems)
    ? booking.bookingItems.reduce(
        (sum, item) => sum + Number(item?.participants || 0),
        0
      )
    : 0;
  const venueGuests = Number(booking?.venueParticipants || 0);

  return roomGuests + venueGuests;
};

const isPaidBooking = (booking) =>
  booking?.payment === true ||
  String(booking?.paymentStatus || "").trim().toLowerCase() === "paid";

const summarizeBookings = (bookings) =>
  bookings.reduce(
    (summary, booking) => {
      const totalPrice = Number(booking?.totalPrice || 0);

      summary.totalBookings += 1;
      summary.totalParticipants += getBookingParticipants(booking);
      summary.totalRoomsBooked += Array.isArray(booking?.bookingItems)
        ? booking.bookingItems.length
        : 0;
      if (isPaidBooking(booking)) {
        summary.totalIncome += totalPrice;
      }

      return summary;
    },
    {
      totalBookings: 0,
      totalParticipants: 0,
      totalRoomsBooked: 0,
      totalIncome: 0,
    }
  );

const extractBookingIds = (bookings) => {
  const seenBookingIds = new Set();

  return bookings.reduce((bookingIds, booking) => {
    const bookingId = booking?._id;
    if (!bookingId) return bookingIds;

    const bookingIdKey = String(bookingId);
    if (seenBookingIds.has(bookingIdKey)) return bookingIds;

    seenBookingIds.add(bookingIdKey);
    bookingIds.push(bookingId);
    return bookingIds;
  }, []);
};

const serializeBookingIds = (bookingIds) =>
  Array.isArray(bookingIds)
    ? bookingIds.map((bookingId) => String(bookingId))
    : [];

const serializeReport = (report, { includeBookingIds = false } = {}) => {
  const bookingIds = serializeBookingIds(report?.bookingIds);

  const serializedReport = {
    id: report._id,
    reportType: report.reportType,
    label: report.label,
    periodMonth: report.periodMonth,
    periodYear: report.periodYear,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    bookingCount: bookingIds.length,
    totalBookings: report.totalBookings,
    totalParticipants: report.totalParticipants,
    totalRoomsBooked: report.totalRoomsBooked,
    totalIncome: report.totalIncome,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };

  if (includeBookingIds) {
    serializedReport.bookingIds = bookingIds;
  }

  return serializedReport;
};

const buildQueryWindow = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid startDate or endDate");
  }

  if (end < start) {
    throw new Error("endDate must be greater than or equal to startDate");
  }

  return { start, end };
};

const fetchBookingsWithinWindow = async (start, end) => {
  const bookings = await bookingModel
    .find({
      ...buildLegacyBookingDateRangeQuery("checkIn", start, end),
    })
    .select(`_id bookingItems venueParticipants totalPrice status payment paymentStatus ${BOOKING_DATE_SELECT}`)
    .lean();

  return bookings.filter((booking) => {
    const referenceDate = getBookingReferenceDate(booking);
    return referenceDate && referenceDate >= start && referenceDate <= end;
  });
};

const buildHistoricalTrend = ({ bookings, reportType, periodYear, periodMonth = null }) => {
  const buckets = [];
  const periodMonthIndex = getPeriodMonthIndex(periodMonth);

  for (let offset = 5; offset >= 0; offset -= 1) {
    if (reportType === "monthly") {
      const bucketDate = new Date(periodYear, periodMonthIndex - 1 - offset, 1);
      buckets.push({
        label: MONTH_NAMES_SHORT[bucketDate.getMonth()],
        year: bucketDate.getFullYear(),
        monthIndex: bucketDate.getMonth(),
        bookings: 0,
        income: 0,
      });
    } else {
      buckets.push({
        label: String(periodYear - offset),
        year: periodYear - offset,
        bookings: 0,
        income: 0,
      });
    }
  }

  bookings.forEach((booking) => {
    const referenceDate = getBookingReferenceDate(booking);
    const manilaParts = getManilaDateParts(referenceDate);

    if (!manilaParts) return;

    const bucket = buckets.find((entry) =>
      reportType === "monthly"
        ? entry.year === manilaParts.year && entry.monthIndex === manilaParts.monthIndex
        : entry.year === manilaParts.year
    );

    if (!bucket) return;

    bucket.bookings += 1;

    if (isPaidBooking(booking)) {
      bucket.income += Number(booking?.totalPrice || 0);
    }
  });

  return {
    labels: buckets.map((entry) => entry.label),
    bookingSeries: buckets.map((entry) => entry.bookings),
    incomeSeries: buckets.map((entry) => entry.income),
  };
};

const buildMonthlyWeekTrend = ({ bookings, periodYear, periodMonth }) => {
  const periodMonthIndex = getPeriodMonthIndex(periodMonth);
  const daysInMonth = new Date(periodYear, periodMonthIndex, 0).getDate();
  const bucketCount = Math.ceil(daysInMonth / 7);
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    label: `W${index + 1}`,
    bookings: 0,
    income: 0,
  }));

  bookings.forEach((booking) => {
    const referenceDate = getBookingReferenceDate(booking);
    const manilaParts = getManilaDateParts(referenceDate);

    if (!manilaParts) return;
    if (manilaParts.year !== periodYear || manilaParts.monthIndex !== periodMonthIndex - 1) return;

    const bucketIndex = Math.floor((manilaParts.day - 1) / 7);
    const bucket = buckets[bucketIndex];

    if (!bucket) return;

    bucket.bookings += 1;

    if (isPaidBooking(booking)) {
      bucket.income += Number(booking?.totalPrice || 0);
    }
  });

  return {
    labels: buckets.map((entry) => entry.label),
    bookingSeries: buckets.map((entry) => entry.bookings),
    incomeSeries: buckets.map((entry) => entry.income),
  };
};

const getHistoricalTrendWindow = (reportType, periodYear, periodMonth = null) => {
  if (reportType === "monthly") {
    const periodMonthIndex = getPeriodMonthIndex(periodMonth);
    const startDate = new Date(periodYear, periodMonthIndex - 1 - 5, 1);
    const selectedWindow = getPeriodWindow(reportType, periodYear, periodMonth);

    return {
      start: createManilaBoundary({
        year: startDate.getFullYear(),
        monthIndex: startDate.getMonth(),
        day: 1,
      }),
      end: selectedWindow.periodEnd,
    };
  }

  return {
    start: createManilaBoundary({
      year: periodYear - 5,
      monthIndex: 0,
      day: 1,
    }),
    end: createManilaBoundary({
      year: periodYear,
      monthIndex: 11,
      day: 31,
      endOfDay: true,
    }),
  };
};

const buildReportDataPayload = async ({ reportType, periodYear, periodMonth = null }) => {
  const periodWindow = getPeriodWindow(reportType, periodYear, periodMonth);
  const periodBookings = await fetchBookingsWithinWindow(
    periodWindow.periodStart,
    periodWindow.periodEnd
  );
  const bookingIds = extractBookingIds(periodBookings);
  const summary = summarizeBookings(periodBookings);
  const historicalWindow = getHistoricalTrendWindow(reportType, periodYear, periodMonth);
  const historicalBookings = await fetchBookingsWithinWindow(
    historicalWindow.start,
    historicalWindow.end
  );
  const historicalTrend = buildHistoricalTrend({
    bookings: historicalBookings,
    reportType,
    periodYear,
    periodMonth,
  });

  return {
    periodWindow,
    bookingIds,
    summary,
    historicalTrend,
    periodTrend:
      reportType === "monthly"
        ? buildMonthlyWeekTrend({
            bookings: periodBookings,
            periodYear,
            periodMonth,
          })
        : historicalTrend,
  };
};

const generateAndStoreReport = async ({
  reportType,
  periodYear,
  periodMonth = null,
}) => {
  const { periodWindow, bookingIds, summary } = await buildReportDataPayload({
    reportType,
    periodYear,
    periodMonth,
  });

  const filter = {
    reportType,
    periodYear,
    periodMonth: reportType === "monthly" ? periodMonth : null,
  };

  const report = await reportModel.findOneAndUpdate(filter, {
    $set: {
      ...periodWindow,
      bookingIds,
      ...summary,
    },
    $unset: {
      approvedBookings: "",
      approvedCount: "",
      cancelledCount: "",
      cancellationPendingCount: "",
      declinedCount: "",
      grossBookingValue: "",
      pendingCount: "",
      paidBookings: "",
    },
  }, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });

  return report;
};

const getReportData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const fallbackType = normalizeReportType(req.query.reportType);
    const fallbackYear = toInteger(req.query.periodYear) || new Date().getFullYear();
    const fallbackMonth =
      fallbackType === "monthly"
        ? normalizePeriodMonth(req.query.periodMonth) || MONTH_NAMES[new Date().getMonth()]
        : null;

    const queryWindow =
      startDate && endDate
        ? buildQueryWindow(startDate, endDate)
        : (() => {
            const periodWindow = getPeriodWindow(
              fallbackType,
              fallbackYear,
              fallbackMonth
            );

            return {
              start: periodWindow.periodStart,
              end: periodWindow.periodEnd,
            };
          })();

    const { start, end } = queryWindow;

    const totalUsers = await userModel.countDocuments();
    const totalRooms = await roomModel.countDocuments();

    if (!startDate || !endDate) {
      const { bookingIds, summary, historicalTrend, periodTrend } = await buildReportDataPayload({
        reportType: fallbackType,
        periodYear: fallbackYear,
        periodMonth: fallbackMonth,
      });

      return res.json({
        success: true,
        coverage: {
          startDate: start,
          endDate: end,
        },
        bookingCount: bookingIds.length,
        ...summary,
        historicalTrend,
        periodTrend,
        totalUsers,
        totalRooms,
      });
    }

    const bookings = await fetchBookingsWithinWindow(start, end);
    const bookingIds = extractBookingIds(bookings);
    const summary = summarizeBookings(bookings);

    return res.json({
      success: true,
      coverage: {
        startDate: start,
        endDate: end,
      },
      bookingCount: bookingIds.length,
      ...summary,
      historicalTrend: null,
      periodTrend: null,
      totalUsers,
      totalRooms,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const listReports = async (req, res) => {
  try {
    const reportType = req.query.reportType
      ? normalizeReportType(req.query.reportType)
      : null;
    const periodYear = toInteger(req.query.periodYear);
    const periodMonth = normalizePeriodMonth(req.query.periodMonth);
    const limit = Math.max(1, Math.min(toInteger(req.query.limit) || 100, 500));

    const filter = {};

    if (reportType) filter.reportType = reportType;
    if (periodYear) filter.periodYear = periodYear;
    if (reportType === "monthly" && periodMonth) filter.periodMonth = periodMonth;

    const reports = await reportModel
      .find(filter)
      .sort({ periodYear: -1, updatedAt: -1 })
      .limit(limit);

    const sortedReports = [...reports].sort((first, second) => {
      if (first.periodYear !== second.periodYear) {
        return Number(second.periodYear || 0) - Number(first.periodYear || 0);
      }

      const monthDifference = comparePeriodMonthsDesc(first.periodMonth, second.periodMonth);
      if (monthDifference !== 0) return monthDifference;

      return new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime();
    });

    return res.json({
      success: true,
      reports: sortedReports.map(serializeReport),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const generateReport = async (req, res) => {
  try {
    const reportType = normalizeReportType(
      req.body.reportType || req.query.reportType
    );
    const periodYear = toInteger(req.body.periodYear || req.query.periodYear);
    const periodMonth = normalizePeriodMonth(req.body.periodMonth || req.query.periodMonth);

    if (!periodYear) {
      return res.status(400).json({
        success: false,
        message: "periodYear is required",
      });
    }

    if (reportType === "monthly" && !periodMonth) {
      return res.status(400).json({
        success: false,
        message: "periodMonth is required for monthly reports",
      });
    }

    const report = await generateAndStoreReport({
      reportType,
      periodYear,
      periodMonth,
    });

    return res.json({
      success: true,
      message: "Report generated successfully",
      report: serializeReport(report, { includeBookingIds: true }),
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export { generateReport, getReportData, listReports };
