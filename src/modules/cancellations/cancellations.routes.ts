import { Router } from 'express';
import { CancellationsController } from './cancellations.controller';
import { optionalAuth, authenticate, validate, idempotencyMiddleware } from '../../app/middleware';
import { cancelBookingSchema } from '../bookings/bookings.validation';

const cancellationsRouter = Router();
const controller = new CancellationsController();

// Direct Mantis GDS IsCancellable query by TicketNo, seatNos, PNRNo
cancellationsRouter.get('/iscancellable', optionalAuth, controller.checkIsCancellableDirect);
cancellationsRouter.post('/iscancellable', optionalAuth, controller.checkIsCancellableDirect);

// Direct Mantis GDS CancelSeats query by TicketNo, SeatNos, PNR — requires auth
cancellationsRouter.post('/cancelseats', authenticate, idempotencyMiddleware(), controller.cancelSeatsDirect);

// Check if booking is cancellable and view refund calculation by booking ID
cancellationsRouter.get('/:bookingId/check', optionalAuth, controller.checkCancellability);

// Cancel seats with idempotency protection — requires authentication
cancellationsRouter.post(
  '/:bookingId',
  authenticate,
  idempotencyMiddleware(),
  validate({ body: cancelBookingSchema }),
  controller.cancelSeats
);

export { cancellationsRouter };
export default cancellationsRouter;
