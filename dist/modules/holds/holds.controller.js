"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HoldsController = void 0;
const holds_service_1 = require("./holds.service");
const response_1 = require("../../shared/utils/response");
class HoldsController {
    holdsService;
    constructor() {
        this.holdsService = holds_service_1.HoldsService.getInstance();
    }
    holdSeats = async (req, res, next) => {
        try {
            const userId = req.user?.sub;
            const result = await this.holdsService.holdSeats(req.body, userId);
            response_1.ApiResponse.created(res, result, 'Seats held successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getHold = async (req, res, next) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const hold = await this.holdsService.getHold(id);
            if (!hold) {
                response_1.ApiResponse.error(res, 'Hold not found', 'NOT_FOUND', 404);
                return;
            }
            response_1.ApiResponse.success(res, hold);
        }
        catch (error) {
            next(error);
        }
    };
    checkHoldStatus = async (req, res, next) => {
        try {
            const holdId = req.params.id || req.body?.holdId || req.body?.HoldId || req.query?.holdId;
            if (!holdId) {
                response_1.ApiResponse.error(res, 'HoldId is required', 'VALIDATION_ERROR', 400);
                return;
            }
            const status = await this.holdsService.checkHoldStatus(holdId);
            response_1.ApiResponse.success(res, status, status.Message || 'Hold status retrieved');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.HoldsController = HoldsController;
//# sourceMappingURL=holds.controller.js.map