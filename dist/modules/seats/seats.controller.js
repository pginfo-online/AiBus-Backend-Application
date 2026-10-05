"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeatsController = void 0;
const seats_service_1 = require("./seats.service");
const response_1 = require("../../shared/utils/response");
class SeatsController {
    seatsService;
    constructor() {
        this.seatsService = seats_service_1.SeatsService.getInstance();
    }
    getSeatChart = async (req, res, next) => {
        try {
            const busIdParam = Array.isArray(req.params.busId) ? req.params.busId[0] : req.params.busId;
            const busId = parseInt(busIdParam, 10);
            const chart = await this.seatsService.getSeatChart(busId);
            response_1.ApiResponse.success(res, chart);
        }
        catch (error) {
            next(error);
        }
    };
}
exports.SeatsController = SeatsController;
//# sourceMappingURL=seats.controller.js.map