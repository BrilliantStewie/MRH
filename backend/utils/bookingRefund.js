import { getBookingCheckInDate } from "./bookingDateFields.js";
import {
  getBookingPaidAmount,
  getMinimumBookingDownpayment,
} from "./bookingPayment.js";

export const BOOKING_REFUND_WINDOW_DAYS = 7;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const normalizeDateOnly = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const normalizeAmount = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return Math.round(numericValue * 100) / 100;
};

const getRefundReferenceDate = (booking = {}, referenceDate = null) =>
  normalizeDateOnly(
    referenceDate ||
      booking?.cancellationRequestedAt ||
      booking?.cancelledAt ||
      booking?.updatedAt ||
      new Date()
  );

export const getBookingRefundSummary = (booking = {}, referenceDate = null) => {
  const checkInDate = normalizeDateOnly(getBookingCheckInDate(booking));
  const refundReferenceDate = getRefundReferenceDate(booking, referenceDate);
  const paidAmount = normalizeAmount(getBookingPaidAmount(booking));
  const refundableAmount = normalizeAmount(
    Math.min(paidAmount, getMinimumBookingDownpayment(booking))
  );

  const daysBeforeCheckIn =
    checkInDate && refundReferenceDate
      ? Math.floor((checkInDate.getTime() - refundReferenceDate.getTime()) / DAY_IN_MS)
      : null;

  const eligible =
    refundableAmount > 0 &&
    Number.isInteger(daysBeforeCheckIn) &&
    daysBeforeCheckIn > BOOKING_REFUND_WINDOW_DAYS;

  let reason = "No confirmed downpayment has been recorded for this booking.";
  if (refundableAmount > 0 && eligible) {
    reason = `Eligible for refund of the confirmed 50% downpayment because cancellation was made more than ${BOOKING_REFUND_WINDOW_DAYS} days before check-in.`;
  } else if (refundableAmount > 0) {
    reason = "";
  }

  return {
    refundWindowDays: BOOKING_REFUND_WINDOW_DAYS,
    refundReferenceDate: refundReferenceDate || null,
    checkInDate: checkInDate || null,
    daysBeforeCheckIn,
    refundableAmount: eligible ? refundableAmount : 0,
    refundableDownpaymentAmount: refundableAmount,
    refundEligible: eligible,
    refundReason: reason,
  };
};
