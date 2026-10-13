"use strict";
// ---------------------------------------------------------------------------
// Admin Dashboard — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboard_service_1 = require("./dashboard.service");
const response_1 = require("../../../shared/utils/response");
class DashboardController {
    service;
    constructor() {
        this.service = dashboard_service_1.DashboardService.getInstance();
    }
    getOverview = async (req, res, next) => {
        try {
            const result = await this.service.getOverview(req.query);
            response_1.ApiResponse.success(res, result, 'Dashboard overview retrieved');
        }
        catch (error) {
            next(error);
        }
    };
    getRevenueAnalytics = async (req, res, next) => {
        try {
            const result = await this.service.getRevenueAnalytics(req.query);
            response_1.ApiResponse.success(res, result, 'Revenue analytics retrieved');
        }
        catch (error) {
            next(error);
        }
    };
    getBookingAnalytics = async (req, res, next) => {
        try {
            const result = await this.service.getBookingAnalytics(req.query);
            response_1.ApiResponse.success(res, result, 'Booking analytics retrieved');
        }
        catch (error) {
            next(error);
        }
    };
    getUserAnalytics = async (req, res, next) => {
        try {
            const result = await this.service.getUserAnalytics(req.query);
            response_1.ApiResponse.success(res, result, 'User analytics retrieved');
        }
        catch (error) {
            next(error);
        }
    };
    getSystemHealth = async (req, res, next) => {
        try {
            const result = await this.service.getSystemHealth();
            response_1.ApiResponse.success(res, result, 'System health retrieved');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=dashboard.controller.js.map