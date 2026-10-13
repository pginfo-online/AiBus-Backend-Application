"use strict";
// ---------------------------------------------------------------------------
// Admin Booking Management — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingManagementController = void 0;
const booking_management_service_1 = require("./booking-management.service");
const response_1 = require("../../../shared/utils/response");
const admin_utils_1 = require("../admin.utils");
class BookingManagementController {
    service;
    constructor() {
        this.service = booking_management_service_1.BookingManagementService.getInstance();
    }
    listBookings = async (req, res, next) => {
        try {
            const { bookings, pagination } = await this.service.listBookings(req.query);
            (0, admin_utils_1.sendAdminPaginated)(res, bookings, pagination);
        }
        catch (error) {
            next(error);
        }
    };
    getBookingDetails = async (req, res, next) => {
        try {
            const booking = await this.service.getBookingDetails(req.params.id);
            response_1.ApiResponse.success(res, booking);
        }
        catch (error) {
            next(error);
        }
    };
    updateBookingStatus = async (req, res, next) => {
        try {
            const booking = await this.service.updateBookingStatus(req.params.id, req.body, req.user.sub);
            response_1.ApiResponse.success(res, booking, 'Booking status updated');
        }
        catch (error) {
            next(error);
        }
    };
    cancelBooking = async (req, res, next) => {
        try {
            const booking = await this.service.adminCancelBooking(req.params.id, req.body, req.user.sub);
            response_1.ApiResponse.success(res, booking, 'Booking cancelled by admin');
        }
        catch (error) {
            next(error);
        }
    };
    reconcileBooking = async (req, res, next) => {
        try {
            const result = await this.service.reconcileBooking(req.params.id, req.user.sub);
            response_1.ApiResponse.success(res, result, 'Reconciliation job queued');
        }
        catch (error) {
            next(error);
        }
    };
    getBookingStats = async (req, res, next) => {
        try {
            const stats = await this.service.getBookingStats();
            response_1.ApiResponse.success(res, stats);
        }
        catch (error) {
            next(error);
        }
    };
    getBookingById = this.getBookingDetails;
    overrideStatus = this.updateBookingStatus;
}
exports.BookingManagementController = BookingManagementController;
//# sourceMappingURL=booking-management.controller.js.map