import { Router } from 'express';
import { BookingsController } from './bookings.controller';
import { validate, optionalAuth, authenticate } from '../../app/middleware';
import { createBookingSchema } from './bookings.validation';

const bookingsRouter = Router();
const controller = new BookingsController();

// Create booking (allows guest or authenticated user)
bookingsRouter.post('/', optionalAuth, validate({ body: createBookingSchema }), controller.createBooking);

// Get current user's bookings (authenticated)
bookingsRouter.get('/my-bookings', authenticate, controller.getUserBookings);

// Check booking status against Hold ID or Booking ID (Mantis GDS /ota/bookingstatusv2)
bookingsRouter.post('/status', optionalAuth, controller.checkBookingStatus);
bookingsRouter.get('/status/:holdId', optionalAuth, controller.checkBookingStatus);

// Get single booking by ID
bookingsRouter.get('/:id', optionalAuth, controller.getBooking);

export { bookingsRouter };
export default bookingsRouter;
