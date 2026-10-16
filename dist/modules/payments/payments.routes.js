"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRouter = void 0;
const express_1 = require("express");
const payments_controller_1 = require("./payments.controller");
const middleware_1 = require("../../app/middleware");
const agents_middleware_1 = require("../agents/agents.middleware");
const payments_validation_1 = require("./payments.validation");
const paymentsRouter = (0, express_1.Router)();
exports.paymentsRouter = paymentsRouter;
const controller = new payments_controller_1.PaymentsController();
// B2B Agent Wallet Payment — requires authenticated approved agent context
paymentsRouter.post('/wallet-pay', middleware_1.authenticate, agents_middleware_1.requireAgentContext, agents_middleware_1.requireAgentKycApproved, (0, middleware_1.idempotencyMiddleware)(), controller.payWithWallet);
// Create payment intent — requires authentication (only confirmed users may pay)
paymentsRouter.post('/intent', middleware_1.authenticate, (0, middleware_1.idempotencyMiddleware)(), (0, middleware_1.validate)({ body: payments_validation_1.createPaymentIntentSchema }), controller.createPaymentIntent);
// Verify payment
paymentsRouter.post('/verify', middleware_1.optionalAuth, (0, middleware_1.idempotencyMiddleware)(), (0, middleware_1.validate)({ body: payments_validation_1.verifyPaymentSchema }), controller.verifyPayment);
// Payment gateway webhook (PhonePe)
paymentsRouter.post('/webhook', (0, middleware_1.validate)({ body: payments_validation_1.webhookPayloadSchema }), controller.handleWebhook);
paymentsRouter.post('/webhook/phonepe', (0, middleware_1.validate)({ body: payments_validation_1.webhookPayloadSchema }), controller.handleWebhook);
// Payment gateway webhook (Razorpay)
paymentsRouter.post('/webhook/razorpay', controller.handleRazorpayWebhook);
paymentsRouter.post('/razorpay-webhook', controller.handleRazorpayWebhook);
// Controlled webhook simulation (local development & testing only)
paymentsRouter.post('/simulate-webhook', (0, middleware_1.validate)({ body: payments_validation_1.simulateWebhookSchema }), controller.simulateWebhook);
// Payment gateway return/redirect URL handler
paymentsRouter.get('/redirect', controller.handleRedirect);
paymentsRouter.post('/redirect', controller.handleRedirect);
// Razorpay Hosted & Mobile Checkout page
paymentsRouter.get('/checkout/:merchantTxnId', controller.renderCheckoutPage);
paymentsRouter.get('/razorpay/checkout/:merchantTxnId', controller.renderCheckoutPage);
exports.default = paymentsRouter;
//# sourceMappingURL=payments.routes.js.map