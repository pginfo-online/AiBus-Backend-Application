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
            const result = await this.cancellationsService.checkCancellability(bookingId, seatNos, req.user?.sub);
            response_1.ApiResponse.success(res, result);
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
            const refundToWallet = req.body?.refundToWallet === true;
            const userId = req.user?.sub;
            const result = await this.cancellationsService.cancelSeats(bookingId, seatNos, reason, userId, refundToWallet);
            response_1.ApiResponse.success(res, result, 'Booking cancelled and refund processed');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.CancellationsController = CancellationsController;
//# sourceMappingURL=cancellations.controller.js.map