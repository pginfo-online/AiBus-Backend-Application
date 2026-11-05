import { CouponStatus, CouponType } from '@prisma/client';
import { getPrismaClient } from '../../infrastructure/database';
import { logger } from '../../infrastructure/logger';
import { NotFoundError, ValidationError } from '../../shared/errors';
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

export class CouponsService {
  private static instance: CouponsService;
  private readonly couponLogger = logger.child({ module: 'coupons-service' });

  public static getInstance(): CouponsService {
    if (!CouponsService.instance) {
      CouponsService.instance = new CouponsService();
    }
    return CouponsService.instance;
  }

  /**
   * Format terms and conditions string into a structured array of points
   */
  public parseTermsAndConditions(rawTerms?: string | null, coupon?: any): string[] {
    if (rawTerms && rawTerms.trim()) {
      return rawTerms
        .split('\n')
        .map((line) => line.replace(/^[0-9]+[.)]\s*/, '').trim())
        .filter(Boolean);
    }

    // Default terms based on coupon attributes (matching redBus ref-4 standard)
    const terms: string[] = [];
    const code = coupon?.code || 'COUPON';
    const val = coupon?.value ? Number(coupon.value) : 10;
    const isPct = coupon?.type === CouponType.PERCENTAGE;
    const maxD = coupon?.maxDiscount ? Number(coupon.maxDiscount) : null;
    const minOrder = coupon?.minOrderValue ? Number(coupon.minOrderValue) : 200;

    if (isPct) {
      terms.push(`Use code ${code} to get ${val}% ${maxD ? `upto ₹${maxD} ` : ''}discount on bus bookings.`);
    } else {
      terms.push(`Use code ${code} to get flat ₹${val} discount on bus bookings.`);
    }

    terms.push(`Offer applicable for minimum ticket value of Rs ${minOrder}.`);
    terms.push('Offer valid only for bus ticket bookings on AiBus mobile app and website.');
    terms.push('Offer is valid for verified users logged in via mobile number or email.');
    terms.push(`Offer codes have an overall limit of ${coupon?.usageLimitPerUser || 1} time(s) per user.`);

    return terms;
  }

  /**
   * Helper to format a coupon record for consistent mobile client consumption
   */
  public formatCoupon(c: any): FormattedCoupon {
    const val = Number(c.value);
    const isPct = c.type === CouponType.PERCENTAGE;
    const maxD = c.maxDiscount ? Number(c.maxDiscount) : null;

    let discountBadge = isPct ? `${val}% OFF` : `₹${val} OFF`;
    if (isPct && maxD) {
      discountBadge = `UPTO ₹${maxD} OFF`;
    }

    const title = c.description || (isPct ? `Save up to Rs ${maxD || val} on bus tickets` : `Save flat Rs ${val} on bus tickets`);
    const subtitle = c.minOrderValue ? `Min. booking amount ₹${Number(c.minOrderValue)}` : 'No minimum booking amount';

    const expiryDate = new Date(c.validUntil);
    const day = expiryDate.getUTCDate();
    const month = expiryDate.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' });
    const formattedExpiry = `Valid till: ${day} ${month}`;

    return {
      id: c.id,
      code: c.code.toUpperCase(),
      category: 'Bus',
      title,
      subtitle,
      type: c.type,
      value: val,
      maxDiscount: maxD,
      minOrderValue: c.minOrderValue ? Number(c.minOrderValue) : null,
      discountBadge,
      validUntil: c.validUntil.toISOString(),
      formattedExpiry,
      description: c.description || title,
      termsAndConditions: this.parseTermsAndConditions(c.termsAndConditions, c),
    };
  }

  /**
   * List all active, valid coupons for mobile display
   */
  public async listActiveCoupons(query: ListCouponsQuery): Promise<{ items: FormattedCoupon[]; total: number }> {
    const prisma = getPrismaClient();
    const now = new Date();

    const where: any = {
      status: CouponStatus.ACTIVE,
      validFrom: { lte: now },
      validUntil: { gte: now },
    };

    if (query.type) {
      where.type = query.type;
    }

    const skip = (query.page - 1) * query.limit;
    const take = query.limit;

    const [total, coupons] = await Promise.all([
      prisma.coupon.count({ where }),
      prisma.coupon.findMany({
        where,
        skip,
        take,
        orderBy: [{ type: 'asc' }, { value: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    // Filter out any coupon that has reached global usage limit
    const availableCoupons = coupons.filter(
      (c) => c.usageLimit === null || c.usageLimit === undefined || c.usedCount < c.usageLimit
    );

    return {
      items: availableCoupons.map((c) => this.formatCoupon(c)),
      total,
    };
  }

  /**
   * Get single coupon details by code
   */
  public async getCouponByCode(code: string): Promise<FormattedCoupon> {
    const prisma = getPrismaClient();
    const normalizedCode = code.trim().toUpperCase();

    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      throw new NotFoundError(`Coupon '${normalizedCode}' not found`);
    }

    return this.formatCoupon(coupon);
  }

  /**
   * Authoritative coupon validation and discount calculation
   */
  public async validateCoupon(input: ValidateCouponInput): Promise<{
    valid: boolean;
    coupon: FormattedCoupon;
    discountAmount: number;
    originalFare: number;
    finalPayableAmount: number;
  }> {
    const prisma = getPrismaClient();
    const normalizedCode = input.code.trim().toUpperCase();
    const totalFare = Number(input.totalFare);

    if (isNaN(totalFare) || totalFare <= 0) {
      throw new ValidationError('Invalid total fare for coupon validation');
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon) {
      throw new ValidationError(`Coupon '${normalizedCode}' is invalid or does not exist`);
    }

    // 1. Check status
    if (coupon.status !== CouponStatus.ACTIVE) {
      throw new ValidationError(`Coupon '${normalizedCode}' is no longer active`);
    }

    // 2. Check validity dates
    const now = new Date();
    if (now < new Date(coupon.validFrom)) {
      throw new ValidationError(`Coupon '${normalizedCode}' is not active yet`);
    }
    if (now > new Date(coupon.validUntil)) {
      throw new ValidationError(`Coupon '${normalizedCode}' has expired`);
    }

    // 3. Check overall usage limit
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
      throw new ValidationError(`Coupon '${normalizedCode}' maximum usage limit has been reached`);
    }

    // 4. Check minimum order value
    if (coupon.minOrderValue !== null && coupon.minOrderValue !== undefined) {
      const minVal = Number(coupon.minOrderValue);
      if (totalFare < minVal) {
        throw new ValidationError(
          `Coupon '${normalizedCode}' requires a minimum booking amount of ₹${minVal}. Current fare: ₹${totalFare}`
        );
      }
    }

    // 5. Check per-user usage limit if user is authenticated
    if (input.userId && coupon.usageLimitPerUser) {
      const userUsageCount = await prisma.couponUsage.count({
        where: {
          couponId: coupon.id,
          userId: input.userId,
        },
      });

      if (userUsageCount >= coupon.usageLimitPerUser) {
        throw new ValidationError(
          `You have already used coupon '${normalizedCode}' the maximum permitted number of times (${coupon.usageLimitPerUser})`
        );
      }
    }

    // 6. Check applicable routes (if configured)
    if (coupon.applicableRoutes) {
      const routes = coupon.applicableRoutes as any;
      if (Array.isArray(routes) && routes.length > 0 && input.fromCityId && input.toCityId) {
        const routeMatch = routes.some(
          (r: any) =>
            (Number(r.fromCityId) === Number(input.fromCityId) && Number(r.toCityId) === Number(input.toCityId)) ||
            (r.fromCityName && r.toCityName)
        );
        if (!routeMatch) {
          throw new ValidationError(`Coupon '${normalizedCode}' is not applicable on this route`);
        }
      }
    }

    // 7. Check applicable operators (if configured)
    if (coupon.applicableOperators) {
      const ops = coupon.applicableOperators as any;
      if (Array.isArray(ops) && ops.length > 0 && input.operatorName) {
        const opMatch = ops.some((op: string) =>
          input.operatorName?.toLowerCase().includes(String(op).toLowerCase())
        );
        if (!opMatch) {
          throw new ValidationError(
            `Coupon '${normalizedCode}' is only valid for selected operators: ${ops.join(', ')}`
          );
        }
      }
    }

    // 8. Calculate Authoritative Discount
    let calculatedDiscount = 0;
    const couponVal = Number(coupon.value);

    if (coupon.type === CouponType.FLAT) {
      calculatedDiscount = Math.min(couponVal, totalFare);
    } else if (coupon.type === CouponType.PERCENTAGE) {
      const rawPctDiscount = (totalFare * couponVal) / 100;
      if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
        const maxD = Number(coupon.maxDiscount);
        calculatedDiscount = Math.min(rawPctDiscount, maxD);
      } else {
        calculatedDiscount = rawPctDiscount;
      }
      calculatedDiscount = Math.min(calculatedDiscount, totalFare);
    }

    // Round to 2 decimal places
    const discountAmount = Math.round(calculatedDiscount * 100) / 100;
    const finalPayableAmount = Math.round(Math.max(0, totalFare - discountAmount) * 100) / 100;

    this.couponLogger.info(
      {
        code: normalizedCode,
        totalFare,
        discountAmount,
        finalPayableAmount,
        userId: input.userId,
      },
      'Coupon validated successfully'
    );

    return {
      valid: true,
      coupon: this.formatCoupon(coupon),
      discountAmount,
      originalFare: totalFare,
      finalPayableAmount,
    };
  }

  /**
   * Record coupon usage upon successful booking confirmation / payment
   */
  public async recordCouponUsage(
    couponId: string,
    userId: string,
    bookingId: string,
    discount: number,
    txClient?: any
  ): Promise<void> {
    const prisma = txClient || getPrismaClient();

    try {
      await Promise.all([
        prisma.couponUsage.create({
          data: {
            couponId,
            userId,
            bookingId,
            discount,
          },
        }),
        prisma.coupon.update({
          where: { id: couponId },
          data: {
            usedCount: { increment: 1 },
          },
        }),
      ]);

      this.couponLogger.info(
        { couponId, userId, bookingId, discount },
        'Recorded coupon usage successfully'
      );
    } catch (err: any) {
      this.couponLogger.error({ err: err.message, couponId, bookingId }, 'Failed to record coupon usage');
    }
  }
}
