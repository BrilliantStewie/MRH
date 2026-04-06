export const BOOKING_DOWNPAYMENT_RATE = 0.5;
export const BOOKING_FOLLOW_UP_MINIMUM_PAYMENT = 100;

const normalizeAmount = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return Math.round(numericValue * 100) / 100;
};

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

export const getBookingTotalAmount = (booking = {}) =>
  normalizeAmount(booking?.totalPrice);

export const getBookingPaidAmount = (booking = {}) => {
  const totalAmount = getBookingTotalAmount(booking);
  const explicitPaidAmount = normalizeAmount(booking?.amountPaid);

  if (explicitPaidAmount > 0) {
    return Math.min(explicitPaidAmount, totalAmount || explicitPaidAmount);
  }

  if (
    booking?.payment === true ||
    normalizeStatus(booking?.paymentStatus) === "paid"
  ) {
    return totalAmount;
  }

  return 0;
};

export const getBookingPendingPaymentAmount = (booking = {}) => {
  const totalAmount = getBookingTotalAmount(booking);
  const remainingBalance = Math.max(totalAmount - getBookingPaidAmount(booking), 0);
  return Math.min(normalizeAmount(booking?.pendingPaymentAmount), remainingBalance);
};

export const getBookingRefundedAmount = (booking = {}) =>
  normalizeAmount(booking?.refundedAmount);

export const getMinimumBookingDownpayment = (booking = {}) =>
  normalizeAmount(getBookingTotalAmount(booking) * BOOKING_DOWNPAYMENT_RATE);

export const getRemainingBookingBalance = (booking = {}) =>
  normalizeAmount(
    Math.max(getBookingTotalAmount(booking) - getBookingPaidAmount(booking), 0)
  );

export const getRemainingBookingDownpayment = (booking = {}) =>
  normalizeAmount(
    Math.max(
      getMinimumBookingDownpayment(booking) - getBookingPaidAmount(booking),
      0
    )
  );

export const getMinimumBookingPaymentAmount = (booking = {}) =>
  (() => {
    const remainingBalance = getRemainingBookingBalance(booking);
    const remainingDownpayment = getRemainingBookingDownpayment(booking);

    if (remainingBalance <= 0) return 0;

    if (remainingDownpayment > 0) {
      return normalizeAmount(Math.min(remainingDownpayment, remainingBalance));
    }

    return normalizeAmount(
      Math.min(BOOKING_FOLLOW_UP_MINIMUM_PAYMENT, remainingBalance)
    );
  })();

export const getBookingNetPaidAmount = (booking = {}) =>
  normalizeAmount(
    Math.max(getBookingPaidAmount(booking) - getBookingRefundedAmount(booking), 0)
  );

export const hasRequiredBookingDownpayment = (booking = {}) =>
  getMinimumBookingDownpayment(booking) <= 0 ||
  getRemainingBookingDownpayment(booking) <= 0;

export const isBookingFullyPaid = (booking = {}) =>
  getBookingTotalAmount(booking) <= 0 ||
  getRemainingBookingBalance(booking) <= 0;

export const getNextBookingPaymentAmount = (booking = {}) =>
  getMinimumBookingPaymentAmount(booking);

export const resolveBookingPaymentAmount = (
  booking = {},
  requestedAmount = null
) => {
  const minimumPaymentAmount = getMinimumBookingPaymentAmount(booking);
  const remainingBalance = getRemainingBookingBalance(booking);
  const remainingDownpayment = getRemainingBookingDownpayment(booking);
  const normalizedRequestedAmount = normalizeAmount(requestedAmount);
  const amount = normalizedRequestedAmount > 0
    ? normalizedRequestedAmount
    : minimumPaymentAmount;

  if (remainingBalance <= 0) {
    return {
      valid: false,
      amount: 0,
      minimumPaymentAmount,
      remainingBalance,
      message: "Booking is already fully paid.",
    };
  }

  if (amount <= 0) {
    return {
      valid: false,
      amount: 0,
      minimumPaymentAmount,
      remainingBalance,
      message: `Please enter an amount between PHP ${minimumPaymentAmount.toLocaleString()} and PHP ${remainingBalance.toLocaleString()}.`,
    };
  }

  if (amount < minimumPaymentAmount) {
    return {
      valid: false,
      amount,
      minimumPaymentAmount,
      remainingBalance,
      message:
        remainingDownpayment > 0
          ? `Please pay at least PHP ${minimumPaymentAmount.toLocaleString()} to secure this booking.`
          : `Please pay at least PHP ${minimumPaymentAmount.toLocaleString()} toward the remaining balance.`,
    };
  }

  if (amount > remainingBalance) {
    return {
      valid: false,
      amount,
      minimumPaymentAmount,
      remainingBalance,
      message: `Payment cannot be more than the remaining balance of PHP ${remainingBalance.toLocaleString()}.`,
    };
  }

  return {
    valid: true,
    amount,
    minimumPaymentAmount,
    remainingBalance,
    message: "",
  };
};

export const getBookingPaymentSnapshot = (booking = {}) => {
  const totalAmount = getBookingTotalAmount(booking);
  const amountPaid = getBookingPaidAmount(booking);
  const pendingPaymentAmount = getBookingPendingPaymentAmount(booking);
  const minimumDownpayment = getMinimumBookingDownpayment(booking);
  const remainingDownpayment = normalizeAmount(
    Math.max(minimumDownpayment - amountPaid, 0)
  );
  const remainingBalance = normalizeAmount(
    Math.max(totalAmount - amountPaid, 0)
  );
  const fullyPaid = totalAmount > 0 ? remainingBalance <= 0 : false;
  const downpaymentSatisfied =
    minimumDownpayment <= 0 || remainingDownpayment <= 0;

  let paymentStatus = "unpaid";
  if (fullyPaid) {
    paymentStatus = "paid";
  } else if (pendingPaymentAmount > 0) {
    paymentStatus = "pending";
  } else if (amountPaid > 0) {
    paymentStatus = "partially_paid";
  }

  return {
    totalAmount,
    amountPaid,
    pendingPaymentAmount,
    minimumDownpayment,
    remainingDownpayment,
    remainingBalance,
    downpaymentSatisfied,
    fullyPaid,
    paymentStatus,
    payment: fullyPaid,
  };
};
