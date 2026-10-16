"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommissionManagementController = void 0;
const commission_management_service_1 = require("./commission-management.service");
const response_1 = require("../../../shared/utils/response");
class CommissionManagementController {
    static instance;
    commissionService;
    constructor() {
        this.commissionService = commission_management_service_1.CommissionManagementService.getInstance();
    }
    static getInstance() {
        if (!CommissionManagementController.instance) {
            CommissionManagementController.instance = new CommissionManagementController();
        }
        return CommissionManagementController.instance;
    }
    listRules = async (req, res, next) => {
        try {
            const query = req.validatedQuery || req.query;
            const result = await this.commissionService.listRules(query);
            response_1.ApiResponse.success(res, result);
        }
        catch (error) {
            next(error);
        }
    };
    createRule = async (req, res, next) => {
        try {
            const adminId = req.user?.sub || 'SYSTEM';
            const body = req.body;
            const result = await this.commissionService.createRule(adminId, body);
            response_1.ApiResponse.created(res, result, 'Commission rule created');
        }
        catch (error) {
            next(error);
        }
    };
    updateRule = async (req, res, next) => {
        try {
            const ruleId = String(req.params.ruleId);
            const body = req.body;
            const result = await this.commissionService.updateRule(ruleId, body);
            response_1.ApiResponse.success(res, result, 'Commission rule updated');
        }
        catch (error) {
            next(error);
        }
    };
    toggleRuleStatus = async (req, res, next) => {
        try {
            const ruleId = String(req.params.ruleId);
            const result = await this.commissionService.toggleRuleStatus(ruleId);
            response_1.ApiResponse.success(res, result, `Commission rule status updated to ${result.isActive ? 'ACTIVE' : 'INACTIVE'}`);
        }
        catch (error) {
            next(error);
        }
    };
    deleteRule = async (req, res, next) => {
        try {
            const ruleId = String(req.params.ruleId);
            await this.commissionService.deleteRule(ruleId);
            response_1.ApiResponse.success(res, null, 'Commission rule deleted');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.CommissionManagementController = CommissionManagementController;
//# sourceMappingURL=commission-management.controller.js.map