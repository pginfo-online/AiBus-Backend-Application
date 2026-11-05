"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponsController = void 0;
const coupons_service_1 = require("./coupons.service");
const response_1 = require("../../shared/utils/response");
class CouponsController {
    service;
    constructor() {
        this.service = coupons_service_1.CouponsService.getInstance();
    }
    listCoupons = async (req, res, next) => {
        try {
            const category = req.query.category ? String(req.query.category) : undefined;
            const type = req.query.type;
            const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
            const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
            const result = await this.service.listActiveCoupons({ category, type, page, limit });
            response_1.ApiResponse.paginated(res, result.items, {
                total: result.total,
                page,
                limit,
                totalPages: Math.ceil(result.total / limit),
                hasNextPage: page * limit < result.total,
                hasPrevPage: page > 1,
            });
        }
        catch (error) {
            next(error);
        }
    };
    getCouponByCode = async (req, res, next) => {
        try {
            const code = String(req.params.code);
            const coupon = await this.service.getCouponByCode(code);
            response_1.ApiResponse.success(res, coupon, 'Coupon retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    validateCoupon = async (req, res, next) => {
        try {
            const userId = req.user?.id || req.body.userId;
            const result = await this.service.validateCoupon({
                ...req.body,
                userId,
            });
            response_1.ApiResponse.success(res, result, 'Coupon validated successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.CouponsController = CouponsController;
//# sourceMappingURL=coupons.controller.js.map