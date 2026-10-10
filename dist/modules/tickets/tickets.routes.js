"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketsRouter = void 0;
const express_1 = require("express");
const tickets_controller_1 = require("./tickets.controller");
const middleware_1 = require("../../app/middleware");
const ticketsRouter = (0, express_1.Router)();
exports.ticketsRouter = ticketsRouter;
const controller = new tickets_controller_1.TicketsController();
ticketsRouter.get('/gds-details', middleware_1.optionalAuth, controller.getGdsBookingDetails);
ticketsRouter.post('/gds-details', middleware_1.optionalAuth, controller.getGdsBookingDetails);
ticketsRouter.get('/booking/:bookingId', middleware_1.optionalAuth, controller.getTicketByBookingId);
ticketsRouter.get('/number/:ticketNumber', middleware_1.optionalAuth, controller.getTicketByTicketNumber);
exports.default = ticketsRouter;
//# sourceMappingURL=tickets.routes.js.map