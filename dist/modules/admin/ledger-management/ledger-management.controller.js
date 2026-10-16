"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerManagementController = void 0;
const ledger_management_service_1 = require("./ledger-management.service");
const response_1 = require("../../../shared/utils/response");
class LedgerManagementController {
    static instance;
    ledgerService;
    constructor() {
        this.ledgerService = ledger_management_service_1.LedgerManagementService.getInstance();
    }
    static getInstance() {
        if (!LedgerManagementController.instance) {
            LedgerManagementController.instance = new LedgerManagementController();
        }
        return LedgerManagementController.instance;
    }
    listLedgerEntries = async (req, res, next) => {
        try {
            const query = req.validatedQuery || req.query;
            const result = await this.ledgerService.listLedgerEntries(query);
            response_1.ApiResponse.success(res, result);
        }
        catch (error) {
            next(error);
        }
    };
    getReconciliationReport = async (_req, res, next) => {
        try {
            const report = await this.ledgerService.getReconciliationReport();
            response_1.ApiResponse.success(res, report);
        }
        catch (error) {
            next(error);
        }
    };
    createManualAdjustment = async (req, res, next) => {
        try {
            const adminId = req.user?.sub || 'SYSTEM';
            const body = req.body;
            const result = await this.ledgerService.createManualAdjustment(adminId, body);
            response_1.ApiResponse.created(res, result, 'Manual ledger adjustment posted');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.LedgerManagementController = LedgerManagementController;
//# sourceMappingURL=ledger-management.controller.js.map