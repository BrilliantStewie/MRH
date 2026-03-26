export const BOOKING_STAY_ACTIONS = Object.freeze({
  CHECK_IN: "checkIn",
  CHECK_OUT: "checkOut",
  NO_SHOW: "noShow",
});

export const BOOKING_STAY_STATUSES = Object.freeze({
  NOT_READY: "notReady",
  AWAITING_CHECK_IN: "awaitingCheckIn",
  CHECKED_IN: "checkedIn",
  CHECKED_OUT: "checkedOut",
  NO_SHOW: "noShow",
});

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .replace(/[_-\s]/g, "")
    .toLowerCase();

const normalizeMappedValue = (value, map, fallback = "") => {
  const token = normalizeToken(value);
  if (!token) return fallback;
  return map[token] || String(value || "").trim();
};

const CHECK_IN_STATUS_MAP = {
  pending: "pending",
  checkedin: BOOKING_STAY_STATUSES.CHECKED_IN,
  noshow: BOOKING_STAY_STATUSES.NO_SHOW,
};

const CHECK_OUT_STATUS_MAP = {
  pending: "pending",
  checkedout: BOOKING_STAY_STATUSES.CHECKED_OUT,
};

const STAY_ACTION_MAP = {
  checkin: BOOKING_STAY_ACTIONS.CHECK_IN,
  checkout: BOOKING_STAY_ACTIONS.CHECK_OUT,
  noshow: BOOKING_STAY_ACTIONS.NO_SHOW,
};

export const normalizeBookingStayAction = (value) =>
  normalizeMappedValue(value, STAY_ACTION_MAP, "");

const normalizeLegacyCheckInStatus = (value) =>
  normalizeMappedValue(value, CHECK_IN_STATUS_MAP, "pending");

const normalizeLegacyCheckOutStatus = (value) =>
  normalizeMappedValue(value, CHECK_OUT_STATUS_MAP, "pending");

export const getBookingStayFlags = (booking = {}) => {
  const legacyCheckInStatus = normalizeLegacyCheckInStatus(booking?.checkInStatus);
  const legacyCheckOutStatus = normalizeLegacyCheckOutStatus(booking?.checkOutStatus);

  const noShow =
    Boolean(booking?.noShow) ||
    legacyCheckInStatus === BOOKING_STAY_STATUSES.NO_SHOW;
  const checkOut =
    !noShow &&
    (Boolean(booking?.checkOut) ||
      legacyCheckOutStatus === BOOKING_STAY_STATUSES.CHECKED_OUT);
  const checkIn =
    !noShow &&
    (Boolean(booking?.checkIn) ||
      checkOut ||
      legacyCheckInStatus === BOOKING_STAY_STATUSES.CHECKED_IN);

  return {
    checkIn,
    checkOut,
    noShow,
  };
};

export const getBookingStayStatus = (booking) => {
  const bookingStatus = String(booking?.status || "").trim().toLowerCase();
  const { checkIn, checkOut, noShow } = getBookingStayFlags(booking);

  if (noShow) {
    return BOOKING_STAY_STATUSES.NO_SHOW;
  }

  if (checkOut) {
    return BOOKING_STAY_STATUSES.CHECKED_OUT;
  }

  if (checkIn) {
    return BOOKING_STAY_STATUSES.CHECKED_IN;
  }

  if (bookingStatus === "approved") {
    return BOOKING_STAY_STATUSES.AWAITING_CHECK_IN;
  }

  return BOOKING_STAY_STATUSES.NOT_READY;
};

export const validateBookingStayAction = (booking, action) => {
  if (!booking) {
    return "Booking not found.";
  }

  const bookingStatus = String(booking.status || "").trim().toLowerCase();
  const { checkIn, checkOut, noShow } = getBookingStayFlags(booking);
  const normalizedAction = normalizeBookingStayAction(action);

  if (!Object.values(BOOKING_STAY_ACTIONS).includes(normalizedAction)) {
    return "Invalid stay action.";
  }

  if (bookingStatus !== "approved") {
    return "Only approved bookings can be updated for stay confirmations.";
  }

  if (normalizedAction === BOOKING_STAY_ACTIONS.CHECK_IN) {
    if (checkIn) {
      return "This booking is already checked in.";
    }

    if (noShow) {
      return "This booking is already marked as no-show.";
    }

    if (checkOut) {
      return "This booking is already checked out.";
    }
  }

  if (normalizedAction === BOOKING_STAY_ACTIONS.NO_SHOW) {
    if (checkIn) {
      return "This guest is already checked in.";
    }

    if (noShow) {
      return "This booking is already marked as no-show.";
    }

    if (checkOut) {
      return "This booking is already checked out.";
    }
  }

  if (normalizedAction === BOOKING_STAY_ACTIONS.CHECK_OUT) {
    if (noShow) {
      return "No-show bookings cannot be checked out.";
    }

    if (!checkIn) {
      return "The guest must be checked in before check-out can be confirmed.";
    }

    if (checkOut) {
      return "This booking is already checked out.";
    }
  }

  return "";
};
