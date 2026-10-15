import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { validate, optionalAuth, authenticate, idempotencyMiddleware } from '../../app/middleware';
import { requireAgentContext, requireAgentKycApproved } from '../agents/agents.middleware';
import {
  createPaymentIntentSchema,
  verifyPaymentSchema,
  webhookPayloadSchema,
  simulateWebhookSchema,
} from './payments.validation';

const paymentsRouter = Router();
const controller = new PaymentsController();

// B2B Agent Wallet Payment — requires authenticated approved agent context
paymentsRouter.post(
  '/wallet-pay',
  authenticate,
  requireAgentContext,
  requireAgentKycApproved,
  idempotencyMiddleware(),
  controller.payWithWallet
);

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

// Payment gateway webhook (PhonePe)
paymentsRouter.post(
  '/webhook',
  validate({ body: webhookPayloadSchema }),
  controller.handleWebhook
);
paymentsRouter.post(
  '/webhook/phonepe',
  validate({ body: webhookPayloadSchema }),
  controller.handleWebhook
);

// Payment gateway webhook (Razorpay)
paymentsRouter.post(
  '/webhook/razorpay',
  controller.handleRazorpayWebhook
);
paymentsRouter.post(
  '/razorpay-webhook',
  controller.handleRazorpayWebhook
);

// Controlled webhook simulation (local development & testing only)
paymentsRouter.post(
  '/simulate-webhook',
  validate({ body: simulateWebhookSchema }),
  controller.simulateWebhook
);

// Payment gateway return/redirect URL handler
paymentsRouter.get('/redirect', controller.handleRedirect);
paymentsRouter.post('/redirect', controller.handleRedirect);

export { paymentsRouter };
export default paymentsRouter;
