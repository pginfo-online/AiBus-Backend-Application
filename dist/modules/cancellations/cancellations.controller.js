"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellationsController = void 0;
const cancellations_service_1 = require("./cancellations.service");
const response_1 = require("../../shared/utils/response");
class CancellationsController {
    cancellationsService;
    constructor() {
        this.cancellationsService = cancellations_service_1.CancellationsService.getInstance();
    }
    checkCancellability = async (req, res, next) => {
        try {
            const bookingId = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
            const seatNos = req.query.seatNos ? req.query.seatNos.split(',') : undefined;
            const result = await this.cancellationsService.checkCancellability(bookingId, seatNos);
            response_1.ApiResponse.success(res, result);
        }
        catch (error) {
            next(error);
        }
    };
    checkIsCancellableDirect = async (req, res, next) => {
        try {
            const ticketNo = (req.query.TicketNo || req.query.ticketNo || req.body?.TicketNo || req.body?.ticketNo);
            const seatNos = (req.query.seatNos || req.query.SeatNos || req.body?.seatNos || req.body?.SeatNos);
            const pnrNo = (req.query.PNRNo || req.query.pnrNo || req.body?.PNRNo || req.body?.pnrNo);
            if (!ticketNo || !seatNos) {
                response_1.ApiResponse.error(res, 'TicketNo and seatNos are required', 'VALIDATION_ERROR', 400);
                return;
            }
            const result = await this.cancellationsService.checkCancellabilityDirect({
                ticketNo,
                seatNos,
                pnrNo,
            });
            response_1.ApiResponse.success(res, result, result.Message || 'Cancellability details retrieved');
        }
        catch (error) {
            next(error);
        }
    };
    cancelSeatsDirect = async (req, res, next) => {
        try {
            const ticketNo = (req.body?.TicketNo || req.body?.ticketNo || req.query?.TicketNo || req.query?.ticketNo);
            const seatNos = (req.body?.SeatNos || req.body?.seatNos || req.query?.SeatNos || req.query?.seatNos);
            const pnr = (req.body?.PNR || req.body?.pnr || req.body?.PNRNo || req.body?.pnrNo || req.query?.PNR || req.query?.pnr);
            if (!ticketNo || !seatNos) {
                response_1.ApiResponse.error(res, 'TicketNo and SeatNos are required in request body', 'VALIDATION_ERROR', 400);
                return;
            }
            const result = await this.cancellationsService.cancelSeatsDirect({
                TicketNo: ticketNo,
                SeatNos: Array.isArray(seatNos) ? seatNos.join(',') : seatNos,
                PNR: pnr,
            });
            response_1.ApiResponse.success(res, result, result.Message || 'Seats cancelled successfully');
        }
        catch (error) {
            next(error);
        }
    };
    cancelSeats = async (req, res, next) => {
        try {
            const bookingId = Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId;
            const rawSeatNos = req.body?.seatNos || req.body?.SeatNos || req.body?.seats;
            const seatNos = Array.isArray(rawSeatNos)
                ? rawSeatNos
                : typeof rawSeatNos === 'string'
                    ? rawSeatNos.split(',')
                    : [];
            const reason = req.body?.reason;
            const userId = req.user?.sub;
            const result = await this.cancellationsService.cancelSeats(bookingId, seatNos, reason, userId);
            response_1.ApiResponse.success(res, result, 'Booking cancelled and refund initiated');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.CancellationsController = CancellationsController;
//# sourceMappingURL=cancellations.controller.js.map