"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRouter = void 0;
const express_1 = require("express");
const payments_controller_1 = require("./payments.controller");
const middleware_1 = require("../../app/middleware");
const payments_validation_1 = require("./payments.validation");
const paymentsRouter = (0, express_1.Router)();
exports.paymentsRouter = paymentsRouter;
const controller = new payments_controller_1.PaymentsController();
// Create payment intent
paymentsRouter.post('/intent', middleware_1.optionalAuth, (0, middleware_1.idempotencyMiddleware)(), (0, middleware_1.validate)({ body: payments_validation_1.createPaymentIntentSchema }), controller.createPaymentIntent);
// Verify payment
paymentsRouter.post('/verify', middleware_1.optionalAuth, (0, middleware_1.idempotencyMiddleware)(), (0, middleware_1.validate)({ body: payments_validation_1.verifyPaymentSchema }), controller.verifyPayment);
// Payment gateway webhook
paymentsRouter.post('/webhook', (0, middleware_1.validate)({ body: payments_validation_1.webhookPayloadSchema }), controller.handleWebhook);
// Payment gateway return/redirect URL handler
paymentsRouter.get('/redirect', controller.handleRedirect);
paymentsRouter.post('/redirect', controller.handleRedirect);
exports.default = paymentsRouter;
//# sourceMappingURL=payments.routes.js.map