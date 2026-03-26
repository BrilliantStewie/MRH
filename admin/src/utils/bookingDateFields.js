const isDateLikeValue = (value) => {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "boolean") return false;

  const parsed = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(parsed.getTime());
};

const pickFirstDateLike = (...values) => {
  const match = values.find((value) => isDateLikeValue(value));
  return typeof match === "undefined" ? null : match;
};

const getBookingCheckInDateValue = (booking) =>
  pickFirstDateLike(
    booking?.checkInDate,
    booking?.checkIn,
    booking?.slotDate,
    booking?.date,
    booking?.createdAt
  );

const getBookingCheckOutDateValue = (booking) =>
  pickFirstDateLike(
    booking?.checkOutDate,
    booking?.checkOut,
    booking?.checkInDate,
    booking?.checkIn,
    booking?.slotDate,
    booking?.date,
    booking?.createdAt
  );

export {
  getBookingCheckInDateValue,
  getBookingCheckOutDateValue,
};
