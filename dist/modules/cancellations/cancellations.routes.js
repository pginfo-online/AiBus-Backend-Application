"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancellationsRouter = void 0;
const express_1 = require("express");
const cancellations_controller_1 = require("./cancellations.controller");
const middleware_1 = require("../../app/middleware");
const bookings_validation_1 = require("../bookings/bookings.validation");
const cancellationsRouter = (0, express_1.Router)();
exports.cancellationsRouter = cancellationsRouter;
const controller = new cancellations_controller_1.CancellationsController();
// Check if booking is cancellable and view refund calculation by booking ID
cancellationsRouter.get('/:bookingId/check', middleware_1.authenticate, controller.checkCancellability);
// Cancel seats with idempotency protection — requires authentication
cancellationsRouter.post('/:bookingId', middleware_1.authenticate, (0, middleware_1.idempotencyMiddleware)(), (0, middleware_1.validate)({ body: bookings_validation_1.cancelBookingSchema }), controller.cancelSeats);
exports.default = cancellationsRouter;
//# sourceMappingURL=cancellations.routes.js.map