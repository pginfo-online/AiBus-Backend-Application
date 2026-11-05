import { CouponType } from '@prisma/client';
import { ListCouponsQuery, ValidateCouponInput } from './coupons.validation';
export interface FormattedCoupon {
    id: string;
    code: string;
    category: string;
    title: string;
    subtitle: string;
    type: CouponType;
    value: number;
    maxDiscount?: number | null;
    minOrderValue?: number | null;
    discountBadge: string;
    validUntil: string;
    formattedExpiry: string;
    description: string;
    termsAndConditions: string[];
}
export declare class CouponsService {
    private static instance;
    private readonly couponLogger;
    static getInstance(): CouponsService;
    /**
     * Format terms and conditions string into a structured array of points
     */
    parseTermsAndConditions(rawTerms?: string | null, coupon?: any): string[];
    /**
     * Helper to format a coupon record for consistent mobile client consumption
     */
    formatCoupon(c: any): FormattedCoupon;
    /**
     * List all active, valid coupons for mobile display
     */
    listActiveCoupons(query: ListCouponsQuery): Promise<{
        items: FormattedCoupon[];
        total: number;
    }>;
    /**
     * Get single coupon details by code
     */
    getCouponByCode(code: string): Promise<FormattedCoupon>;
    /**
     * Authoritative coupon validation and discount calculation
     */
    validateCoupon(input: ValidateCouponInput): Promise<{
        valid: boolean;
        coupon: FormattedCoupon;
        discountAmount: number;
        originalFare: number;
        finalPayableAmount: number;
    }>;
    /**
     * Record coupon usage upon successful booking confirmation / payment
     */
    recordCouponUsage(couponId: string, userId: string, bookingId: string, discount: number, txClient?: any): Promise<void>;
}
//# sourceMappingURL=coupons.service.d.ts.map