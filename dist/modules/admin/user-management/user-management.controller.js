"use strict";
// ---------------------------------------------------------------------------
// Admin User Management — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManagementController = void 0;
const user_management_service_1 = require("./user-management.service");
const response_1 = require("../../../shared/utils/response");
const admin_utils_1 = require("../admin.utils");
class UserManagementController {
    service;
    constructor() {
        this.service = user_management_service_1.UserManagementService.getInstance();
    }
    listUsers = async (req, res, next) => {
        try {
            const { users, pagination } = await this.service.listUsers(req.query);
            (0, admin_utils_1.sendAdminPaginated)(res, users, pagination);
        }
        catch (error) {
            next(error);
        }
    };
    getUserDetails = async (req, res, next) => {
        try {
            const { id } = req.params;
            const user = await this.service.getUserDetails(id);
            response_1.ApiResponse.success(res, user);
        }
        catch (error) {
            next(error);
        }
    };
    updateUser = async (req, res, next) => {
        try {
            const { id } = req.params;
            const adminRole = req.user.role;
            const user = await this.service.updateUser(id, req.body, adminRole);
            response_1.ApiResponse.success(res, user, 'User updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    suspendUser = async (req, res, next) => {
        try {
            const { id } = req.params;
            const adminId = req.user.sub;
            const user = await this.service.suspendUser(id, req.body, adminId);
            response_1.ApiResponse.success(res, user, 'User suspended successfully');
        }
        catch (error) {
            next(error);
        }
    };
    activateUser = async (req, res, next) => {
        try {
            const { id } = req.params;
            const adminId = req.user.sub;
            const user = await this.service.activateUser(id, adminId);
            response_1.ApiResponse.success(res, user, 'User activated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getUserBookings = async (req, res, next) => {
        try {
            const { id } = req.params;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const { bookings, pagination } = await this.service.getUserBookings(id, page, limit);
            (0, admin_utils_1.sendAdminPaginated)(res, bookings, pagination);
        }
        catch (error) {
            next(error);
        }
    };
    getUserPayments = async (req, res, next) => {
        try {
            const { id } = req.params;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const { payments, pagination } = await this.service.getUserPayments(id, page, limit);
            (0, admin_utils_1.sendAdminPaginated)(res, payments, pagination);
        }
        catch (error) {
            next(error);
        }
    };
    getUserWallet = async (req, res, next) => {
        try {
            const { id } = req.params;
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;
            const { transactions, pagination } = await this.service.getUserWallet(id, page, limit);
            (0, admin_utils_1.sendAdminPaginated)(res, transactions, pagination);
        }
        catch (error) {
            next(error);
        }
    };
    getUserWalletTransactions = this.getUserWallet;
}
exports.UserManagementController = UserManagementController;
//# sourceMappingURL=user-management.controller.js.map