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
    payWithWallet = async (req, res, next) => {
        try {
            const bookingId = req.body.bookingId;
            const agentId = req.agentId;
            const userId = req.user?.sub;
            const result = await this.paymentsService.payWithWallet(bookingId, agentId, userId);
            response_1.ApiResponse.success(res, result, 'Wallet payment successful and booking confirmed');
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
    handleRazorpayWebhook = async (req, res, next) => {
        try {
            const rawBody = req.rawBody || req.body;
            const result = await this.paymentsService.handleRazorpayWebhook(rawBody, req.headers);
            response_1.ApiResponse.success(res, result);
        }
        catch (error) {
            next(error);
        }
    };
    simulateWebhook = async (req, res, next) => {
        try {
            const result = await this.paymentsService.simulateWebhook(req.body);
            response_1.ApiResponse.success(res, result, 'Webhook simulated and processed successfully');
        }
        catch (error) {
            next(error);
        }
    };
    handleRedirect = async (req, res, next) => {
        try {
            const merchantTxnId = (req.query.merchantOrderId || req.query.merchantTxnId || req.body?.merchantOrderId || req.body?.merchantTxnId || req.query.transactionId || '');
            const bookingId = (req.query.bookingId || req.body?.bookingId || '');
            const redirectUrlParam = (req.query.redirectUrl || req.body?.redirectUrl || '');
            if (redirectUrlParam && (redirectUrlParam.startsWith('aibus://') || redirectUrlParam.startsWith('exp://'))) {
                const sep = redirectUrlParam.includes('?') ? '&' : '?';
                res.redirect(`${redirectUrlParam}${sep}merchantTxnId=${encodeURIComponent(merchantTxnId)}&bookingId=${encodeURIComponent(bookingId)}`);
                return;
            }
            const frontendUrl = `http://localhost:5173/payment-result?merchantTxnId=${encodeURIComponent(merchantTxnId)}&bookingId=${encodeURIComponent(bookingId)}`;
            res.redirect(frontendUrl);
        }
        catch (error) {
            next(error);
        }
    };
    renderCheckoutPage = async (req, res, next) => {
        try {
            const merchantTxnId = String(req.params.merchantTxnId || '');
            const redirectUrlParam = req.query.redirectUrl || undefined;
            const checkoutHtml = await this.paymentsService.generateCheckoutHtml(merchantTxnId, redirectUrlParam);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(checkoutHtml);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.PaymentsController = PaymentsController;
//# sourceMappingURL=payments.controller.js.map