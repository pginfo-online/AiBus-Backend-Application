"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsController = void 0;
const payments_service_1 = require("./payments.service");
const response_1 = require("../../shared/utils/response");
class PaymentsController {
    paymentsService;
    constructor() {
        this.paymentsService = payments_service_1.PaymentsService.getInstance();
    }
    createPaymentIntent = async (req, res, next) => {
        try {
            const userId = req.user?.sub;
            const result = await this.paymentsService.createPaymentIntent(req.body, userId);
            response_1.ApiResponse.created(res, result, 'Payment intent created');
        }
        catch (error) {
            next(error);
        }
    };
    verifyPayment = async (req, res, next) => {
        try {
            const result = await this.paymentsService.verifyPayment(req.body);
            response_1.ApiResponse.success(res, result, 'Payment verified and booking confirmed');
        }
        catch (error) {
            next(error);
        }
    };
    handleWebhook = async (req, res, next) => {
        try {
            const rawBody = req.body.response;
            const xVerify = req.headers['x-verify'];
            const result = await this.paymentsService.handleWebhook(rawBody, xVerify);
            response_1.ApiResponse.success(res, result);
        }
        catch (error) {
            next(error);
        }
    };
    handleRedirect = async (req, res, next) => {
        try {
            const merchantTxnId = (req.query.merchantOrderId || req.query.merchantTxnId || req.body?.merchantOrderId || req.body?.merchantTxnId || req.query.transactionId || '');
            const bookingId = (req.query.bookingId || req.body?.bookingId || '');
            const frontendUrl = `http://localhost:5173/payment-result?merchantTxnId=${encodeURIComponent(merchantTxnId)}&bookingId=${encodeURIComponent(bookingId)}`;
            res.redirect(frontendUrl);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.PaymentsController = PaymentsController;
//# sourceMappingURL=payments.controller.js.map