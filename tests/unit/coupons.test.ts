import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CouponsService } from '../../src/modules/coupons/coupons.service';
import { CouponType, CouponStatus } from '@prisma/client';

describe('CouponsService Unit Tests', () => {
  let service: CouponsService;

  beforeEach(() => {
    service = CouponsService.getInstance();
  });

  describe('formatCoupon', () => {
    it('formats a percentage coupon with cap properly', () => {
      const mockRaw = {
        id: '11111111-1111-1111-1111-111111111111',
        code: 'BUS300',
        type: CouponType.PERCENTAGE,
        value: 5,
        maxDiscount: 300,
        minOrderValue: 200,
        status: CouponStatus.ACTIVE,
        description: 'Save up to Rs 300 on bus tickets',
        termsAndConditions: '1. Term one\n2. Term two',
        validUntil: new Date('2027-10-31T23:59:59.000Z'),
        usageLimitPerUser: 1,
      };

      const formatted = service.formatCoupon(mockRaw);
      expect(formatted.code).toBe('BUS300');
      expect(formatted.discountBadge).toBe('UPTO ₹300 OFF');
      expect(formatted.category).toBe('Bus');
      expect(formatted.termsAndConditions).toEqual(['Term one', 'Term two']);
      expect(formatted.formattedExpiry).toContain('31 Oct');
    });

    it('formats a flat coupon properly', () => {
      const mockRaw = {
        id: '22222222-2222-2222-2222-222222222222',
        code: 'FLAT100',
        type: CouponType.FLAT,
        value: 100,
        maxDiscount: null,
        minOrderValue: 500,
        status: CouponStatus.ACTIVE,
        description: null,
        termsAndConditions: null,
        validUntil: new Date('2027-12-31T23:59:59.000Z'),
      };

      const formatted = service.formatCoupon(mockRaw);
      expect(formatted.code).toBe('FLAT100');
      expect(formatted.discountBadge).toBe('₹100 OFF');
      expect(formatted.termsAndConditions.length).toBeGreaterThan(0);
      expect(formatted.subtitle).toBe('Min. booking amount ₹500');
    });
  });

  describe('parseTermsAndConditions', () => {
    it('generates standard redBus-like fallback terms when raw terms not provided', () => {
      const terms = service.parseTermsAndConditions(null, {
        code: 'BUS300',
        type: CouponType.PERCENTAGE,
        value: 5,
        maxDiscount: 300,
        minOrderValue: 200,
      });

      expect(terms.length).toBe(5);
      expect(terms[0]).toContain('5% upto ₹300');
      expect(terms[1]).toContain('Rs 200');
    });
  });
});
