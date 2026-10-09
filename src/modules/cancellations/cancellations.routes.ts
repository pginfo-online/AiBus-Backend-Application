import { Router } from 'express';
import { CancellationsController } from './cancellations.controller';
import { optionalAuth, validate, idempotencyMiddleware } from '../../app/middleware';
import { cancelBookingSchema } from '../bookings/bookings.validation';

const cancellationsRouter = Router();
const controller = new CancellationsController();

// Direct Mantis GDS IsCancellable query by TicketNo, seatNos, PNRNo
cancellationsRouter.get('/iscancellable', optionalAuth, controller.checkIsCancellableDirect);
cancellationsRouter.post('/iscancellable', optionalAuth, controller.checkIsCancellableDirect);

// Direct Mantis GDS CancelSeats query by TicketNo, SeatNos, PNR
cancellationsRouter.post('/cancelseats', optionalAuth, idempotencyMiddleware(), controller.cancelSeatsDirect);

// Check if booking is cancellable and view refund calculation by booking ID
cancellationsRouter.get('/:bookingId/check', optionalAuth, controller.checkCancellability);

// Cancel seats with idempotency protection
cancellationsRouter.post(
  '/:bookingId',
  optionalAuth,
  idempotencyMiddleware(),
  validate({ body: cancelBookingSchema }),
  controller.cancelSeats
);

export { cancellationsRouter };
export default cancellationsRouter;
