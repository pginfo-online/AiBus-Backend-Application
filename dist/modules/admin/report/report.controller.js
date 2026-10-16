"use strict";
// ---------------------------------------------------------------------------
// Admin Report Management — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const report_service_1 = require("./report.service");
const utils_1 = require("../../../shared/utils");
const admin_utils_1 = require("../admin.utils");
class ReportController {
    service = report_service_1.ReportService.getInstance();
    getRevenueReport = async (req, res, next) => {
        try {
            const query = req.query;
            const data = await this.service.getRevenueReport(query);
            if (query.format === 'csv') {
                const headers = ['bookingNumber', 'operatorName', 'baseFare', 'serviceTax', 'convenienceFee', 'discountAmount', 'totalFare', 'date'];
                (0, admin_utils_1.sendCsvResponse)(res, `revenue-report-${Date.now()}.csv`, headers, data);
                return;
            }
            utils_1.ApiResponse.success(res, data, 'Revenue report generated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getBookingReport = async (req, res, next) => {
        try {
            const query = req.query;
            const data = await this.service.getBookingReport(query);
            if (query.format === 'csv') {
                const headers = ['bookingNumber', 'pnrNumber', 'route', 'journeyDate', 'operatorName', 'busType', 'totalFare', 'status', 'passengerName', 'passengerPhone', 'bookedAt'];
                (0, admin_utils_1.sendCsvResponse)(res, `booking-report-${Date.now()}.csv`, headers, data);
                return;
            }
            utils_1.ApiResponse.success(res, data, 'Booking report generated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getUserReport = async (req, res, next) => {
        try {
            const query = req.query;
            const data = await this.service.getUserReport(query);
            if (query.format === 'csv') {
                const headers = ['id', 'name', 'email', 'phone', 'role', 'status', 'totalBookings', 'registeredAt'];
                (0, admin_utils_1.sendCsvResponse)(res, `user-report-${Date.now()}.csv`, headers, data);
                return;
            }
            utils_1.ApiResponse.success(res, data, 'User report generated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getCancellationReport = async (req, res, next) => {
        try {
            const query = req.query;
            const data = await this.service.getCancellationReport(query);
            if (query.format === 'csv') {
                const headers = ['id', 'bookingNumber', 'operatorName', 'seatNumbers', 'totalFare', 'cancellationCharge', 'refundAmount', 'status', 'cancelledAt'];
                (0, admin_utils_1.sendCsvResponse)(res, `cancellation-report-${Date.now()}.csv`, headers, data);
                return;
            }
            utils_1.ApiResponse.success(res, data, 'Cancellation report generated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getPaymentReport = async (req, res, next) => {
        try {
            const query = req.query;
            const data = await this.service.getPaymentReport(query);
            if (query.format === 'csv') {
                const headers = ['id', 'bookingNumber', 'merchantTxnId', 'gatewayOrderId', 'gateway', 'amount', 'status', 'webhookVerified', 'createdAt'];
                (0, admin_utils_1.sendCsvResponse)(res, `payment-report-${Date.now()}.csv`, headers, data);
                return;
            }
            utils_1.ApiResponse.success(res, data, 'Payment report generated successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.ReportController = ReportController;
//# sourceMappingURL=report.controller.js.map