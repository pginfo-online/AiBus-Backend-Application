import { Router } from 'express';
import { CouponsController } from './coupons.controller';
import { validate, optionalAuth } from '../../app/middleware';
import {
  listCouponsQuerySchema,
  validateCouponSchema,
  couponCodeParamSchema,
} from './coupons.validation';

const router = Router();
const controller = new CouponsController();

// GET /api/v1/coupons (or /api/v1/offers) - Public list of active coupons
router.get('/', validate({ query: listCouponsQuerySchema }), controller.listCoupons);

// POST /api/v1/coupons/validate - Authoritative validation & discount calculation
router.post('/validate', optionalAuth, validate({ body: validateCouponSchema }), controller.validateCoupon);

// GET /api/v1/coupons/:code - Single coupon details & terms
router.get('/:code', validate({ params: couponCodeParamSchema }), controller.getCouponByCode);

export { router as couponsRouter };
export default router;
