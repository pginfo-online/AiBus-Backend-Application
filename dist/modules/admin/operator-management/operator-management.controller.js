"use strict";
// ---------------------------------------------------------------------------
// Admin Operator Management — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperatorManagementController = void 0;
const operator_management_service_1 = require("./operator-management.service");
const utils_1 = require("../../../shared/utils");
class OperatorManagementController {
    service = operator_management_service_1.OperatorManagementService.getInstance();
    listOperators = async (req, res, next) => {
        try {
            const result = await this.service.listOperators(req.query);
            utils_1.ApiResponse.paginated(res, result.items, result.pagination, 'Operators retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getOperatorById = async (req, res, next) => {
        try {
            const id = req.params.id;
            const operator = await this.service.getOperatorById(id);
            utils_1.ApiResponse.success(res, operator, 'Operator details retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    createOperator = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const operator = await this.service.createOperator(req.body, adminId);
            utils_1.ApiResponse.created(res, operator, 'Operator created successfully');
        }
        catch (error) {
            next(error);
        }
    };
    updateOperator = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const id = req.params.id;
            const operator = await this.service.updateOperator(id, req.body, adminId);
            utils_1.ApiResponse.success(res, operator, 'Operator updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    suspendOperator = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const id = req.params.id;
            const { reason } = req.body;
            const operator = await this.service.suspendOperator(id, reason, adminId);
            utils_1.ApiResponse.success(res, operator, 'Operator suspended successfully');
        }
        catch (error) {
            next(error);
        }
    };
    activateOperator = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const id = req.params.id;
            const operator = await this.service.activateOperator(id, adminId);
            utils_1.ApiResponse.success(res, operator, 'Operator activated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getOperatorBookings = async (req, res, next) => {
        try {
            const id = req.params.id;
            const result = await this.service.getOperatorBookings(id, req.query);
            utils_1.ApiResponse.paginated(res, result.items, result.pagination, 'Operator bookings retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.OperatorManagementController = OperatorManagementController;
//# sourceMappingURL=operator-management.controller.js.map