"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingsRouter = void 0;
const express_1 = require("express");
const bookings_controller_1 = require("./bookings.controller");
const middleware_1 = require("../../app/middleware");
const bookings_validation_1 = require("./bookings.validation");
const bookingsRouter = (0, express_1.Router)();
exports.bookingsRouter = bookingsRouter;
const controller = new bookings_controller_1.BookingsController();
// Create booking (allows guest or authenticated user)
bookingsRouter.post('/', middleware_1.optionalAuth, (0, middleware_1.validate)({ body: bookings_validation_1.createBookingSchema }), controller.createBooking);
// Get current user's bookings (authenticated)
bookingsRouter.get('/my-bookings', middleware_1.authenticate, controller.getUserBookings);
// Check booking status against Hold ID or Booking ID (Mantis GDS /ota/bookingstatusv2)
bookingsRouter.post('/status', middleware_1.optionalAuth, controller.checkBookingStatus);
bookingsRouter.get('/status/:holdId', middleware_1.optionalAuth, controller.checkBookingStatus);
// Get single booking by ID
bookingsRouter.get('/:id', middleware_1.optionalAuth, controller.getBooking);
exports.default = bookingsRouter;
//# sourceMappingURL=bookings.routes.js.map