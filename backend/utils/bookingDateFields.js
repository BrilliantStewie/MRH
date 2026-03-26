const isDateLikeValue = (value) => {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "boolean") return false;

  const parsed = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const coerceBookingDateValue = (value) => {
  if (!isDateLikeValue(value)) return null;
  return value instanceof Date ? value : new Date(value);
};

const getBookingCheckInDate = (booking) =>
  coerceBookingDateValue(booking?.checkInDate ?? booking?.checkIn);

const getBookingCheckOutDate = (booking) =>
  coerceBookingDateValue(booking?.checkOutDate ?? booking?.checkOut);

const buildLegacyBookingDateRangeQuery = (dateField, start, end) => ({
  $or: [
    {
      [`${dateField}Date`]: {
        $gte: start,
        $lte: end,
      },
    },
    {
      [dateField]: {
        $type: "date",
        $gte: start,
        $lte: end,
      },
    },
  ],
});

const BOOKING_DATE_SELECT =
  "checkIn checkInDate checkOut checkOutDate";

export {
  BOOKING_DATE_SELECT,
  buildLegacyBookingDateRangeQuery,
  coerceBookingDateValue,
  getBookingCheckInDate,
  getBookingCheckOutDate,
  isDateLikeValue,
};
