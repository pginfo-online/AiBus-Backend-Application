"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentGatewayAdminController = void 0;
const payment_gateways_service_1 = require("./payment-gateways.service");
const payment_gateways_validation_1 = require("./payment-gateways.validation");
const response_1 = require("../../../shared/utils/response");
class PaymentGatewayAdminController {
    service;
    constructor() {
        this.service = payment_gateways_service_1.PaymentGatewayAdminService.getInstance();
    }
    listGateways = async (_req, res, next) => {
        try {
            const gateways = await this.service.listGateways();
            response_1.ApiResponse.success(res, { gateways }, 'Payment gateways retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    updateGateway = async (req, res, next) => {
        try {
            const gateway = req.params.gateway;
            const validated = payment_gateways_validation_1.updateGatewayConfigSchema.parse(req.body);
            const adminId = req.admin?.id || req.user?.sub;
            const updated = await this.service.updateGateway(gateway, validated, adminId);
            response_1.ApiResponse.success(res, { gateway: updated }, 'Payment gateway configuration updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    toggleGateway = async (req, res, next) => {
        try {
            const gateway = req.params.gateway;
            const validated = payment_gateways_validation_1.toggleGatewaySchema.parse(req.body);
            const adminId = req.admin?.id || req.user?.sub;
            const updated = await this.service.toggleGateway(gateway, validated, adminId);
            response_1.ApiResponse.success(res, { gateway: updated }, `Payment gateway ${validated.isEnabled ? 'enabled' : 'disabled'} successfully`);
        }
        catch (error) {
            next(error);
        }
    };
    getGatewayMetrics = async (_req, res, next) => {
        try {
            const metrics = await this.service.getGatewayMetrics();
            response_1.ApiResponse.success(res, metrics, 'Payment gateway metrics retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.PaymentGatewayAdminController = PaymentGatewayAdminController;
//# sourceMappingURL=payment-gateways.controller.js.map