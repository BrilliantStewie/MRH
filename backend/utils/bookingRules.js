import { getBookingStayFlags } from "./bookingStay.js";
import { getBookingCheckOutDate } from "./bookingDateFields.js";

const normalizeDate = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const addDays = (date, days) => {
  const updated = new Date(date);
  updated.setDate(updated.getDate() + days);
  return updated;
};

const rangesOverlap = (startA, endA, startB, endB) =>
  startA <= endB && endA >= startB;

const isRoomPackageType = (value) =>
  String(value || "").trim().toLowerCase() === "room package";

const isVenuePackageType = (value) =>
  String(value || "").trim().toLowerCase() === "venue package";

const getBookingReviewEligibility = (booking, now = new Date()) => {
  if (!booking) {
    return {
      eligible: false,
      message: "Booking not found.",
    };
  }

  if (String(booking.status || "").trim().toLowerCase() !== "approved") {
    return {
      eligible: false,
      message: "Reviews are only available for approved bookings.",
    };
  }

  if (getBookingStayFlags(booking).noShow) {
    return {
      eligible: false,
      message: "No-show bookings cannot be reviewed.",
    };
  }

  const checkOut = getBookingCheckOutDate(booking);
  if (Number.isNaN(checkOut.getTime())) {
    return {
      eligible: false,
      message: "Booking check-out date is invalid.",
    };
  }

  if (now <= checkOut) {
    return {
      eligible: false,
      message: "You can review this booking after your stay is complete.",
    };
  }

  return {
    eligible: true,
    message: "",
  };
};

export {
  addDays,
  getBookingReviewEligibility,
  isRoomPackageType,
  isVenuePackageType,
  normalizeDate,
  rangesOverlap,
};
