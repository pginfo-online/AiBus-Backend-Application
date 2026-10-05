"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsController = void 0;
const bookings_service_1 = require("./bookings.service");
const response_1 = require("../../shared/utils/response");
class BookingsController {
    bookingsService;
    constructor() {
        this.bookingsService = bookings_service_1.BookingsService.getInstance();
    }
    createBooking = async (req, res, next) => {
        try {
            const userId = req.user?.sub;
            const booking = await this.bookingsService.createBooking(req.body, userId);
            response_1.ApiResponse.created(res, booking, 'Booking initiated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getBooking = async (req, res, next) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const booking = await this.bookingsService.getBooking(id);
            response_1.ApiResponse.success(res, booking);
        }
        catch (error) {
            next(error);
        }
    };
    getUserBookings = async (req, res, next) => {
        try {
            const userId = req.user.sub;
            const bookings = await this.bookingsService.getUserBookings(userId);
            response_1.ApiResponse.success(res, bookings);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.BookingsController = BookingsController;
//# sourceMappingURL=bookings.controller.js.map