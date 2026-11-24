"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellationsController = void 0;
const cancellations_service_1 = require("./cancellations.service");
const gdsAdapter_1 = require("../../providers/gds/gdsAdapter");
const response_1 = require("../../shared/utils/response");
class CancellationsController {
    cancellationsService;
    gdsAdapter;
    constructor() {
        this.cancellationsService = cancellations_service_1.CancellationsService.getInstance();
        this.gdsAdapter = gdsAdapter_1.GdsAdapter.getInstance();
    }
    checkCancellability = async (req, res, next) => {
        try {
            const bookingId = Array.isArray(req.params.bookingId)
                ? req.params.bookingId[0]
                : req.params.bookingId;
            const seatNos = req.query.seatNos
                ? req.query.seatNos.split(",")
                : undefined;
            const result = await this.cancellationsService.checkCancellability(bookingId, seatNos, req.user?.sub);
            response_1.ApiResponse.success(res, result);
        }
        catch (error) {
            next(error);
        }
    };
    cancelSeats = async (req, res, next) => {
        try {
            const bookingId = Array.isArray(req.params.bookingId)
                ? req.params.bookingId[0]
                : req.params.bookingId;
            const rawSeatNos = req.body?.seatNos || req.body?.SeatNos || req.body?.seats;
            const seatNos = Array.isArray(rawSeatNos)
                ? rawSeatNos
                : typeof rawSeatNos === "string"
                    ? rawSeatNos.split(",")
                    : [];
            const reason = req.body?.reason;
            const refundToWallet = req.body?.refundToWallet === true;
            const userId = req.user?.sub;
            const result = await this.cancellationsService.cancelSeats(bookingId, seatNos, reason, userId, refundToWallet);
            (0, response_1.sendSuccess)(res, { data: result, statusCode: result.cancellation.status === 'COMPLETED' ? 200 : 202 });
        }
        catch (error) {
            next(error);
        }
    };
    checkDirectCancellability = async (req, res, next) => {
        try {
            const ticketNo = String(req.query.TicketNo || req.query.ticketNo || "");
            const seatNos = String(req.query.SeatNos || req.query.seatNos || "");
            const pnrNo = req.query.PNRNo || req.query.pnrNo || req.query.PNR ? String(req.query.PNRNo || req.query.pnrNo || req.query.PNR) : undefined;
            const result = await this.gdsAdapter.isCancellable(ticketNo, seatNos, pnrNo);
            response_1.ApiResponse.success(res, result);
        }
        catch (error) {
            next(error);
        }
    };
    cancelDirectSeats = async (req, res, next) => {
        try {
            const ticketNo = String(req.body.TicketNo || req.body.ticketNo || "");
            const seatNos = String(req.body.SeatNos || req.body.seatNos || "");
            const pnr = req.body.PNR || req.body.PNRNo || req.body.pnr ? String(req.body.PNR || req.body.PNRNo || req.body.pnr) : undefined;
            const result = await this.gdsAdapter.cancelSeats({
                TicketNo: ticketNo,
                SeatNos: seatNos,
                PNR: pnr,
            });
            response_1.ApiResponse.success(res, result);
        }
        catch (error) {
            next(error);
        }
    };
    getAgentBalance = async (_req, res, next) => {
        try {
            const result = await this.gdsAdapter.getBalance();
            response_1.ApiResponse.success(res, result);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.CancellationsController = CancellationsController;
//# sourceMappingURL=cancellations.controller.js.map