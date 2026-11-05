import { Router } from 'express';
import { CancellationsController } from './cancellations.controller';
import { authenticate, validate, idempotencyMiddleware } from '../../app/middleware';
import { cancelBookingSchema } from '../bookings/bookings.validation';

const cancellationsRouter = Router();
const controller = new CancellationsController();

// Check if booking is cancellable and view refund calculation by booking ID
cancellationsRouter.get('/:bookingId/check', authenticate, controller.checkCancellability);

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
