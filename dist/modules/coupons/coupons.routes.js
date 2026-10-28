"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.couponsRouter = void 0;
const express_1 = require("express");
const coupons_controller_1 = require("./coupons.controller");
const middleware_1 = require("../../app/middleware");
const coupons_validation_1 = require("./coupons.validation");
const router = (0, express_1.Router)();
exports.couponsRouter = router;
const controller = new coupons_controller_1.CouponsController();
// GET /api/v1/coupons (or /api/v1/offers) - Public list of active coupons
router.get('/', (0, middleware_1.validate)({ query: coupons_validation_1.listCouponsQuerySchema }), controller.listCoupons);
// POST /api/v1/coupons/validate - Authoritative validation & discount calculation
router.post('/validate', middleware_1.optionalAuth, (0, middleware_1.validate)({ body: coupons_validation_1.validateCouponSchema }), controller.validateCoupon);
// GET /api/v1/coupons/:code - Single coupon details & terms
router.get('/:code', (0, middleware_1.validate)({ params: coupons_validation_1.couponCodeParamSchema }), controller.getCouponByCode);
exports.default = router;
//# sourceMappingURL=coupons.routes.js.map