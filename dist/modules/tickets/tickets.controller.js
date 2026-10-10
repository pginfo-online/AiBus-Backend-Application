"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsController = void 0;
const tickets_service_1 = require("./tickets.service");
const response_1 = require("../../shared/utils/response");
class TicketsController {
    ticketsService;
    constructor() {
        this.ticketsService = tickets_service_1.TicketsService.getInstance();
    }
    getTicketByBookingId = async (req, res, next) => {
        try {
            const bookingId = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
            const ticket = await this.ticketsService.getTicketByBookingId(bookingId);
            response_1.ApiResponse.success(res, ticket);
        }
        catch (error) {
            next(error);
        }
    };
    getTicketByTicketNumber = async (req, res, next) => {
        try {
            const ticketNumber = Array.isArray(req.params.ticketNumber) ? req.params.ticketNumber[0] : req.params.ticketNumber;
            const ticket = await this.ticketsService.getTicketByTicketNumber(ticketNumber);
            response_1.ApiResponse.success(res, ticket);
        }
        catch (error) {
            next(error);
        }
    };
    getGdsBookingDetails = async (req, res, next) => {
        try {
            const pnr = (req.query.PNR || req.query.pnr || req.query.PNRNo || req.query.pnrNo || req.body?.PNR || req.body?.pnr || req.body?.PNRNo || req.body?.pnrNo);
            const ticketNo = (req.query.TicketNo || req.query.ticketNo || req.body?.TicketNo || req.body?.ticketNo);
            if (!pnr || !ticketNo) {
                response_1.ApiResponse.error(res, 'PNR and TicketNo are required query parameters', 'VALIDATION_ERROR', 400);
                return;
            }
            const result = await this.ticketsService.getGdsBookingDetails(pnr, ticketNo);
            response_1.ApiResponse.success(res, result, 'Provider booking details retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.TicketsController = TicketsController;
//# sourceMappingURL=tickets.controller.js.map