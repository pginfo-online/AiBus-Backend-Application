"use strict";
// ---------------------------------------------------------------------------
// Admin Coupon Management — Controller
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponManagementController = void 0;
const coupon_management_service_1 = require("./coupon-management.service");
const utils_1 = require("../../../shared/utils");
class CouponManagementController {
    service = coupon_management_service_1.CouponManagementService.getInstance();
    listCoupons = async (req, res, next) => {
        try {
            const result = await this.service.listCoupons(req.query);
            utils_1.ApiResponse.paginated(res, result.items, result.pagination, 'Coupons retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getCouponById = async (req, res, next) => {
        try {
            const id = req.params.id;
            const coupon = await this.service.getCouponById(id);
            utils_1.ApiResponse.success(res, coupon, 'Coupon details retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
    createCoupon = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const coupon = await this.service.createCoupon(req.body, adminId);
            utils_1.ApiResponse.created(res, coupon, 'Coupon created successfully');
        }
        catch (error) {
            next(error);
        }
    };
    updateCoupon = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const id = req.params.id;
            const coupon = await this.service.updateCoupon(id, req.body, adminId);
            utils_1.ApiResponse.success(res, coupon, 'Coupon updated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    deactivateCoupon = async (req, res, next) => {
        try {
            const adminId = req.user.sub;
            const id = req.params.id;
            const coupon = await this.service.deactivateCoupon(id, adminId);
            utils_1.ApiResponse.success(res, coupon, 'Coupon deactivated successfully');
        }
        catch (error) {
            next(error);
        }
    };
    getCouponUsage = async (req, res, next) => {
        try {
            const id = req.params.id;
            const result = await this.service.getCouponUsage(id, req.query);
            utils_1.ApiResponse.paginated(res, result.items, result.pagination, 'Coupon usages retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    };
}
exports.CouponManagementController = CouponManagementController;
//# sourceMappingURL=coupon-management.controller.js.map