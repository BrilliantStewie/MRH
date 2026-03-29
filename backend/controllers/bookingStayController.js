import bookingModel from "../models/bookingModel.js";
import userModel from "../models/userModel.js";
import { createOrRefreshNotification } from "../utils/notificationUtils.js";
import sendEmail from "../utils/sendEmail.js";
import {
  applyNoShowDisable,
  formatDisableUntilLabel,
} from "../utils/accountStatus.js";
import {
  BOOKING_STAY_ACTIONS,
  normalizeBookingStayAction,
  validateBookingStayAction,
} from "../utils/bookingStay.js";

const getActorId = (req) => req.userId || req.user?.id || null;

const getGuestName = (booking) =>
  booking?.userId?.firstName ||
  booking?.userId?.name ||
  "Guest";

const getBookingLabel = (booking) =>
  booking?.bookingName ||
  booking?.bookingItems?.[0]?.roomId?.name ||
  "your reservation";

const buildActionMessages = (action, booking, options = {}) => {
  const bookingLabel = getBookingLabel(booking);
  const disabledUntilLabel = options.disabledUntilLabel || "";

  if (action === BOOKING_STAY_ACTIONS.CHECK_IN) {
    return {
      successMessage: "Check-in confirmed.",
      notificationType: "stay_update",
      notificationMessage: `Your check-in has been confirmed for ${bookingLabel}.`,
      emailSubject: "Check-in confirmed - Mercedarian Retreat House",
      emailBody: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
          <p>Hello ${getGuestName(booking)},</p>
          <p>Your arrival has been confirmed for <strong>${bookingLabel}</strong>.</p>
          <p>We hope you enjoy your stay at Mercedarian Retreat House.</p>
          <p>Mercedarian Retreat House</p>
        </div>
      `,
    };
  }

  if (action === BOOKING_STAY_ACTIONS.CHECK_OUT) {
    return {
      successMessage: "Check-out confirmed.",
      notificationType: "stay_update",
      notificationMessage: `Your check-out has been confirmed for ${bookingLabel}.`,
      emailSubject: "Check-out confirmed - Mercedarian Retreat House",
      emailBody: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
          <p>Hello ${getGuestName(booking)},</p>
          <p>Your stay has been checked out successfully for <strong>${bookingLabel}</strong>.</p>
          <p>Thank you for staying with Mercedarian Retreat House.</p>
          <p>Mercedarian Retreat House</p>
        </div>
      `,
    };
  }

  return {
    successMessage: disabledUntilLabel
      ? `Booking marked as no-show. Guest account disabled until ${disabledUntilLabel}.`
      : "Booking marked as no-show.",
    notificationType: "stay_update",
    notificationMessage: disabledUntilLabel
      ? `Your booking for ${bookingLabel} was marked as no-show. Your account is disabled until ${disabledUntilLabel}.`
      : `Your booking for ${bookingLabel} was marked as no-show.`,
    emailSubject: "Booking marked as no-show - Mercedarian Retreat House",
    emailBody: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <p>Hello ${getGuestName(booking)},</p>
        <p>Your booking for <strong>${bookingLabel}</strong> has been marked as no-show.</p>
        ${
          disabledUntilLabel
            ? `<p>Your guest account has been temporarily disabled until <strong>${disabledUntilLabel}</strong>.</p>`
            : ""
        }
        <p>If you believe this is a mistake, please contact Mercedarian Retreat House as soon as possible.</p>
        <p>Mercedarian Retreat House</p>
      </div>
    `,
  };
};

export const updateBookingStayStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const normalizedAction = normalizeBookingStayAction(req.body?.action);
    const actorId = getActorId(req);

    const booking = await bookingModel
      .findById(bookingId)
      .populate("userId")
      .populate("bookingItems.roomId");

    const validationMessage = validateBookingStayAction(booking, normalizedAction);
    if (validationMessage) {
      return res.json({ success: false, message: validationMessage });
    }

    const now = new Date();
    let disabledUntilLabel = "";

    if (normalizedAction === BOOKING_STAY_ACTIONS.CHECK_IN) {
      booking.checkIn = true;
      booking.noShow = false;
      booking.checkInConfirmedAt = now;
      booking.checkInConfirmedBy = actorId;
      booking.checkOut = false;
      booking.checkOutConfirmedAt = null;
      booking.checkOutConfirmedBy = null;
    } else if (normalizedAction === BOOKING_STAY_ACTIONS.CHECK_OUT) {
      booking.checkOut = true;
      booking.checkOutConfirmedAt = now;
      booking.checkOutConfirmedBy = actorId;
    } else {
      booking.noShow = true;
      booking.checkIn = false;
      booking.checkInConfirmedAt = now;
      booking.checkInConfirmedBy = actorId;
      booking.checkOut = false;
      booking.checkOutConfirmedAt = null;
      booking.checkOutConfirmedBy = null;

      if (req.userRole === "admin" && booking.userId?._id) {
        const guestUser = await userModel.findById(booking.userId._id);

        if (guestUser && guestUser.role === "guest") {
          const disabledUntil = applyNoShowDisable(guestUser, now);
          await guestUser.save();
          disabledUntilLabel = formatDisableUntilLabel(disabledUntil);
        }
      }
    }

    await booking.save();

    const {
      successMessage,
      notificationType,
      notificationMessage,
      emailSubject,
      emailBody,
    } = buildActionMessages(normalizedAction, booking, { disabledUntilLabel });

    if (booking.userId?._id) {
      await createOrRefreshNotification({
        recipient: booking.userId._id,
        type: notificationType,
        message: notificationMessage,
        link: `/my-bookings?bookingId=${booking._id}`,
        isRead: false,
      });
    }

    if (booking.userId?.email) {
      await sendEmail(booking.userId.email, emailSubject, emailBody);
    }

    return res.json({
      success: true,
      message: successMessage,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};
