import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { validate, optionalAuth, authenticate, idempotencyMiddleware } from '../../app/middleware';
import {
  createPaymentIntentSchema,
  verifyPaymentSchema,
  webhookPayloadSchema,
} from './payments.validation';

const paymentsRouter = Router();
const controller = new PaymentsController();

// Create payment intent — requires authentication (only confirmed users may pay)
paymentsRouter.post(
  '/intent',
  authenticate,
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

// Payment gateway return/redirect URL handler
paymentsRouter.get('/redirect', controller.handleRedirect);
paymentsRouter.post('/redirect', controller.handleRedirect);

export { paymentsRouter };
export default paymentsRouter;
