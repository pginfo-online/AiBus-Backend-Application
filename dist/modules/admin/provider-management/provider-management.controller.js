"use strict";
// ---------------------------------------------------------------------------
// Admin Provider Management — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderManagementController = void 0;
const provider_management_service_1 = require("./provider-management.service");
const utils_1 = require("../../../shared/utils");
class ProviderManagementController {
    service = provider_management_service_1.ProviderManagementService.getInstance();
    getProviders = async (_req, res, next) => {
        try {
            const providers = await this.service.getProviders();
            utils_1.ApiResponse.success(res, providers, 'Providers retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getProviderHealth = async (req, res, next) => {
        try {
            const name = req.params.name;
            const health = await this.service.getProviderHealth(name);
            utils_1.ApiResponse.success(res, health, 'Provider health checked successfully');
        }
        catch (error) {
            next(error);
        }
    };
    listTransactions = async (req, res, next) => {
        try {
            const result = await this.service.listTransactions(req.query);
            utils_1.ApiResponse.paginated(res, result.items, result.pagination, 'Provider transactions retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getTransactionById = async (req, res, next) => {
        try {
            const id = req.params.id;
            const transaction = await this.service.getTransactionById(id);
            utils_1.ApiResponse.success(res, transaction, 'Provider transaction details retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getProviderBalance = async (req, res, next) => {
        try {
            const name = req.params.name;
            const balance = await this.service.getProviderBalance(name);
            utils_1.ApiResponse.success(res, balance, 'Provider balance retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.ProviderManagementController = ProviderManagementController;
//# sourceMappingURL=provider-management.controller.js.map