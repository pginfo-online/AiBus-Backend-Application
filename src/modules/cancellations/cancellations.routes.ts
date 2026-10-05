import { Router } from 'express';
import { CancellationsController } from './cancellations.controller';
import { optionalAuth, validate, idempotencyMiddleware } from '../../app/middleware';
import { cancelBookingSchema } from '../bookings/bookings.validation';

const cancellationsRouter = Router();
const controller = new CancellationsController();

// Check if booking is cancellable and view refund calculation
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
