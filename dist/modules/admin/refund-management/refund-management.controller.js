"use strict";
// ---------------------------------------------------------------------------
// Admin Refund Management — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundManagementController = void 0;
const refund_management_service_1 = require("./refund-management.service");
const utils_1 = require("../../../shared/utils");
class RefundManagementController {
    service = refund_management_service_1.RefundManagementService.getInstance();
    listRefunds = async (req, res, next) => {
        try {
            const result = await this.service.listRefunds(req.query);
            utils_1.ApiResponse.paginated(res, result.items, result.pagination, 'Refunds retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getRefundById = async (req, res, next) => {
        try {
            const id = req.params.id;
            const refund = await this.service.getRefundById(id);
            utils_1.ApiResponse.success(res, refund, 'Refund details retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    processRefund = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const id = req.params.id;
            const { notes } = req.body;
            const result = await this.service.processRefund(id, adminId, notes);
            utils_1.ApiResponse.success(res, result, 'Refund processed successfully');
        }
        catch (error) {
            next(error);
        }
    };
    retryRefund = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const id = req.params.id;
            const result = await this.service.retryRefund(id, adminId);
            utils_1.ApiResponse.success(res, result, 'Refund retry scheduled successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getRefundStats = async (_req, res, next) => {
        try {
            const stats = await this.service.getRefundStats();
            utils_1.ApiResponse.success(res, stats, 'Refund statistics retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.RefundManagementController = RefundManagementController;
//# sourceMappingURL=refund-management.controller.js.map