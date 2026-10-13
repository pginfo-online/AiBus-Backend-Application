import { PaginatedResult } from '../admin.utils';
import { ListCouponsQuery, CreateCouponInput, UpdateCouponInput } from './coupon-management.validation';
export declare class CouponManagementService {
    private static instance;
    private readonly logger;
    static getInstance(): CouponManagementService;
    /**
     * List coupons with pagination and filtering
     */
    listCoupons(query: ListCouponsQuery): Promise<PaginatedResult<any>>;
    /**
     * Get single coupon details
     */
    getCouponById(id: string): Promise<any>;
    /**
     * Create a new coupon
     */
    createCoupon(input: CreateCouponInput, adminId: string): Promise<any>;
    /**
     * Update coupon configuration
     */
    updateCoupon(id: string, input: UpdateCouponInput, adminId: string): Promise<any>;
    /**
     * Deactivate a coupon
     */
    deactivateCoupon(id: string, adminId: string): Promise<any>;
    /**
     * Get usage history for a coupon
     */
    getCouponUsage(couponId: string, query: {
        page?: number;
        limit?: number;
    }): Promise<PaginatedResult<any>>;
}
//# sourceMappingURL=coupon-management.service.d.ts.map