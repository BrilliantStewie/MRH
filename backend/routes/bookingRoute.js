import express from 'express';
import authUser from '../middlewares/authUser.js';

import {
  createBooking,
  userBookings,
  cancelBooking,
  markCash,
  verifyPayment,
  createCheckoutSession,
  rateBooking,
  checkAvailability,
  getUnavailableDates,
  getBookedRoomsForRange,
  getOccupiedRooms,
  getUserBookedDates,
  getCalendarAvailability
} from '../controllers/bookingController.js';

const bookingRouter = express.Router();

// BOOKINGS
bookingRouter.post('/create', authUser, createBooking);
bookingRouter.get('/user/bookings', authUser, userBookings);
bookingRouter.post('/cancel-booking', authUser, cancelBooking);

// PAYMENTS
bookingRouter.post('/create-checkout-session', authUser, createCheckoutSession);
bookingRouter.post('/mark-cash', authUser, markCash);
bookingRouter.post('/verify-payment', authUser, verifyPayment);

// RATINGS
bookingRouter.post('/rate-booking', authUser, rateBooking);

// AVAILABILITY
bookingRouter.post('/check-availability', checkAvailability);
bookingRouter.post('/unavailable-dates', getUnavailableDates);
bookingRouter.post('/booked-rooms', getBookedRoomsForRange);
bookingRouter.get('/occupied', getOccupiedRooms);
bookingRouter.get('/user-dates', authUser, getUserBookedDates);
bookingRouter.get('/calendar-availability', getCalendarAvailability);

export default bookingRouter;
