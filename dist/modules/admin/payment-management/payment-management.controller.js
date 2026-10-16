"use strict";
// ---------------------------------------------------------------------------
// Admin Payment Management — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentManagementController = void 0;
const payment_management_service_1 = require("./payment-management.service");
const response_1 = require("../../../shared/utils/response");
const admin_utils_1 = require("../admin.utils");
class PaymentManagementController {
    service;
    constructor() {
        this.service = payment_management_service_1.PaymentManagementService.getInstance();
    }
    listPayments = async (req, res, next) => {
        try {
            const { payments, pagination } = await this.service.listPayments(req.query);
            (0, admin_utils_1.sendAdminPaginated)(res, payments, pagination);
        }
        catch (error) {
            next(error);
        }
    };
    getPaymentDetails = async (req, res, next) => {
        try {
            const payment = await this.service.getPaymentDetails(req.params.id);
            response_1.ApiResponse.success(res, payment);
        }
        catch (error) {
            next(error);
        }
    };
    reconcilePayment = async (req, res, next) => {
        try {
            const result = await this.service.reconcilePayment(req.params.id, req.user.sub);
            response_1.ApiResponse.success(res, result, 'Reconciliation job queued');
        }
        catch (error) {
            next(error);
        }
    };
    getPaymentStats = async (req, res, next) => {
        try {
            const stats = await this.service.getPaymentStats();
            response_1.ApiResponse.success(res, stats);
        }
        catch (error) {
            next(error);
        }
    };
    getPaymentById = this.getPaymentDetails;
}
exports.PaymentManagementController = PaymentManagementController;
//# sourceMappingURL=payment-management.controller.js.map