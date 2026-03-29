import { getBookingCheckInDateValue } from "./bookingDateFields";
import { getPHDateValue } from "./dateTime";

const STAY_STATUS_META = {
  notReady: {
    label: "Not Ready",
    className: "bg-slate-100 text-slate-500 border-slate-200",
    description: "Stay confirmation opens after approval.",
  },
  awaitingCheckIn: {
    label: "Awaiting Check-In",
    className: "bg-amber-50 text-amber-700 border-amber-100",
    description: "",
  },
  checkedIn: {
    label: "Checked In",
    className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    description: "Guest is currently staying on-site.",
  },
  checkedOut: {
    label: "Checked Out",
    className: "bg-sky-50 text-sky-700 border-sky-100",
    description: "Stay has been completed and confirmed.",
  },
  noShow: {
    label: "No-Show",
    className: "bg-rose-50 text-rose-700 border-rose-100",
    description: "Guest did not arrive for the booking.",
  },
};

const PAYMENT_PENDING_META = {
  label: "Payment Pending",
  className: "bg-amber-50 text-amber-700 border-amber-100",
  description: "",
};

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .replace(/[_-\s]/g, "")
    .toLowerCase();

const normalizeStayStatus = (value) => {
  const token = normalizeToken(value);
  if (!token) return "notReady";
  if (token === "awaitingcheckin") return "awaitingCheckIn";
  if (token === "checkedin") return "checkedIn";
  if (token === "checkedout") return "checkedOut";
  if (token === "noshow") return "noShow";
  return "notReady";
};

const buildActorName = (user) => {
  if (!user || typeof user !== "object") return "";
  if (user.name) return user.name;

  return [user.firstName, user.middleName, user.lastName, user.suffix]
    .filter(Boolean)
    .join(" ")
    .trim();
};

const formatDateTimePHT = (value) => {
  if (!value) return "";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "";
  }
};

const getBookingStayFlags = (booking = {}) => {
  const legacyCheckInStatus = normalizeToken(booking?.checkInStatus);
  const legacyCheckOutStatus = normalizeToken(booking?.checkOutStatus);

  const noShow = Boolean(booking?.noShow) || legacyCheckInStatus === "noshow";
  const checkOut = !noShow && (Boolean(booking?.checkOut) || legacyCheckOutStatus === "checkedout");
  const checkIn =
    !noShow &&
    (Boolean(booking?.checkIn) || checkOut || legacyCheckInStatus === "checkedin");

  return { checkIn, checkOut, noShow };
};

const hasReachedCheckInDate = (booking = {}) => {
  const checkInDateValue = getPHDateValue(getBookingCheckInDateValue(booking));
  if (!checkInDateValue) return false;

  const todayValue = getPHDateValue(new Date());
  return Boolean(todayValue) && todayValue >= checkInDateValue;
};

const isPaymentConfirmed = (booking = {}) =>
  String(booking?.paymentStatus || "").trim().toLowerCase() === "paid" ||
  booking?.payment === true;

export const getBookingStayStatus = (booking = {}) => {
  if (booking?.stayStatus) {
    const normalizedStayStatus = normalizeStayStatus(booking.stayStatus);
    if (normalizedStayStatus === "awaitingCheckIn" && !hasReachedCheckInDate(booking)) {
      return "notReady";
    }
    return normalizedStayStatus;
  }

  const bookingStatus = String(booking?.status || "").trim().toLowerCase();
  const { checkIn, checkOut, noShow } = getBookingStayFlags(booking);

  if (noShow) return "noShow";
  if (checkOut) return "checkedOut";
  if (checkIn) return "checkedIn";
  if (bookingStatus === "approved" && hasReachedCheckInDate(booking)) {
    return "awaitingCheckIn";
  }
  return "notReady";
};

export const getStayStatusMeta = (booking = {}) => {
  const stayStatus = getBookingStayStatus(booking);

  if (stayStatus === "awaitingCheckIn" && !isPaymentConfirmed(booking)) {
    return PAYMENT_PENDING_META;
  }

  return STAY_STATUS_META[stayStatus] || STAY_STATUS_META.notReady;
};

export const getStayStatusDescription = (booking = {}) => {
  const stayStatus = getBookingStayStatus(booking);

  if (stayStatus === "checkedIn") {
    const actorName = buildActorName(booking.checkInConfirmedBy);
    const timestamp = formatDateTimePHT(booking.checkInConfirmedAt);
    if (!timestamp) return "Guest arrival has been confirmed.";
    return actorName
      ? `Confirmed ${timestamp} by ${actorName}.`
      : `Confirmed ${timestamp}.`;
  }

  if (stayStatus === "checkedOut") {
    return "";
  }

  if (stayStatus === "noShow") {
    return "";
  }

  return getStayStatusMeta(booking).description;
};

export const getStayConfirmationDetails = (booking = {}) => {
  const stayStatus = getBookingStayStatus(booking);
  const checkInActorName = buildActorName(booking.checkInConfirmedBy);
  const checkOutActorName = buildActorName(booking.checkOutConfirmedBy);
  const checkInTimestamp = formatDateTimePHT(booking.checkInConfirmedAt);
  const checkOutTimestamp = formatDateTimePHT(booking.checkOutConfirmedAt);

  return {
    checkIn: {
      label: stayStatus === "noShow" ? "Marked No-Show" : booking?.checkIn ? "Confirmed" : "Pending",
      actorName: checkInActorName,
      timestamp: checkInTimestamp,
      fallbackMessage:
        stayStatus === "noShow"
          ? "No-show has not been recorded yet."
          : "Check-in has not been confirmed yet.",
    },
    checkOut: {
      label: booking?.checkOut ? "Confirmed" : "Pending",
      actorName: checkOutActorName,
      timestamp: checkOutTimestamp,
      fallbackMessage: "Check-out has not been confirmed yet.",
    },
  };
};

export const getAvailableStayActions = (booking = {}) => {
  const bookingStatus = String(booking?.status || "").trim().toLowerCase();
  const stayStatus = getBookingStayStatus(booking);
  const paymentConfirmed = isPaymentConfirmed(booking);

  return {
    canConfirmCheckIn:
      bookingStatus === "approved" &&
      stayStatus === "awaitingCheckIn" &&
      paymentConfirmed,
    canMarkNoShow:
      bookingStatus === "approved" &&
      stayStatus === "awaitingCheckIn" &&
      paymentConfirmed,
    canConfirmCheckOut: bookingStatus === "approved" && stayStatus === "checkedIn",
  };
};

export const shouldShowStayStatus = (booking = {}) =>
  getBookingStayStatus(booking) !== "notReady";

export const shouldShowBookingStatus = (booking = {}) => {
  const stayStatus = getBookingStayStatus(booking);
  return !["awaitingCheckIn", "checkedIn", "checkedOut", "noShow"].includes(stayStatus);
};

export const getBookingArchiveStatus = (booking = {}) => {
  const stayStatus = getBookingStayStatus(booking);
  const bookingStatus = String(booking?.status || "").trim().toLowerCase();

  return stayStatus === "checkedOut" || stayStatus === "noShow" || bookingStatus === "cancelled"
    ? "archived"
    : "active";
};

export const matchesBookingArchiveFilter = (booking = {}, filterValue = "") => {
  const normalizedFilter = String(filterValue || "").trim().toLowerCase();

  if (!normalizedFilter || normalizedFilter === "all bookings") {
    return true;
  }

  if (normalizedFilter === "archived") {
    return getBookingArchiveStatus(booking) === "archived";
  }

  if (normalizedFilter === "active") {
    return getBookingArchiveStatus(booking) === "active";
  }

  return true;
};

export const matchesBookingStatusFilter = (booking = {}, filterValue = "") => {
  const normalizedFilter = String(filterValue || "").trim().toLowerCase();
  if (!normalizedFilter || normalizedFilter === "all status") {
    return true;
  }

  return (
    String(booking?.status || "").trim().toLowerCase() === normalizedFilter ||
    getBookingStayStatus(booking) === normalizedFilter
  );
};
