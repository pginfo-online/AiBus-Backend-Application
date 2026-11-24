import { Router } from "express";
import { CancellationsController } from "./cancellations.controller";
import {
  optionalAuth,
  validate,
} from "../../app/middleware";
import { cancelBookingSchema } from "../bookings/bookings.validation";

const cancellationsRouter = Router();
const controller = new CancellationsController();

// 1. Direct Mantis GDS endpoints (pass-through / diagnostics)
cancellationsRouter.get(
  "/iscancellable",
  optionalAuth,
  controller.checkDirectCancellability,
);

cancellationsRouter.post(
  "/cancelseats",
  optionalAuth,
  controller.cancelDirectSeats,
);

cancellationsRouter.get(
  "/agent-balance",
  optionalAuth,
  controller.getAgentBalance,
);

// 2. Booking-specific cancellation endpoints
// Check if booking is cancellable and view live refund calculation
cancellationsRouter.get(
  "/:bookingId/check",
  optionalAuth,
  controller.checkCancellability,
);

// Cancel seats with idempotency protection
cancellationsRouter.post(
  "/:bookingId",
  optionalAuth,
  validate({ body: cancelBookingSchema }),
  controller.cancelSeats,
);

export { cancellationsRouter };
export default cancellationsRouter;
