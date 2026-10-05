import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { validate, optionalAuth, idempotencyMiddleware } from '../../app/middleware';
import {
  createPaymentIntentSchema,
  verifyPaymentSchema,
  webhookPayloadSchema,
} from './payments.validation';

const paymentsRouter = Router();
const controller = new PaymentsController();

// Create payment intent
paymentsRouter.post(
  '/intent',
  optionalAuth,
  idempotencyMiddleware(),
  validate({ body: createPaymentIntentSchema }),
  controller.createPaymentIntent
);

// Verify payment
paymentsRouter.post(
  '/verify',
  optionalAuth,
  idempotencyMiddleware(),
  validate({ body: verifyPaymentSchema }),
  controller.verifyPayment
);

// Payment gateway webhook
paymentsRouter.post(
  '/webhook',
  validate({ body: webhookPayloadSchema }),
  controller.handleWebhook
);

export { paymentsRouter };
export default paymentsRouter;
