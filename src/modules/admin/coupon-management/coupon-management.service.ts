// ---------------------------------------------------------------------------
// Admin Coupon Management — Service
// Coupon creation, updates, lifecycle control, and usage analytics
// ---------------------------------------------------------------------------

import { CouponStatus, CouponType } from '@prisma/client';
import { getPrismaClient } from '../../../infrastructure/database';
import { logger } from '../../../infrastructure/logger';
import { NotFoundError, ConflictError } from '../../../shared/errors';
import { buildPagination, PaginatedResult } from '../admin.utils';
import {
  ListCouponsQuery,
  CreateCouponInput,
  UpdateCouponInput,
} from './coupon-management.validation';

export class CouponManagementService {
  private static instance: CouponManagementService;
  private readonly logger = logger.child({ module: 'admin-coupon-management' });

  public static getInstance(): CouponManagementService {
    if (!CouponManagementService.instance) {
      CouponManagementService.instance = new CouponManagementService();
    }
    return CouponManagementService.instance;
  }

  /**
   * List coupons with pagination and filtering
   */
  public async listCoupons(query: ListCouponsQuery): Promise<PaginatedResult<any>> {
    const prisma = getPrismaClient();
    const { skip, take, page, limit } = buildPagination(query);

    const where: any = {};

    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.type) {
      where.type = query.type as CouponType;
    }

    if (query.status) {
      where.status = query.status as CouponStatus;
    }

    const orderBy: any = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [total, coupons] = await Promise.all([
      prisma.coupon.count({ where }),
      prisma.coupon.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          _count: {
            select: { usages: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: coupons,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get single coupon details
   */
  public async getCouponById(id: string): Promise<any> {
    const prisma = getPrismaClient();

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundError(`Coupon with ID '${id}' not found`);
    }

    return coupon;
  }

  /**
   * Create a new coupon
   */
  public async createCoupon(input: CreateCouponInput, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.coupon.findUnique({
      where: { code: input.code },
    });

    if (existing) {
      throw new ConflictError(`Coupon with code '${input.code}' already exists`);
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: input.code,
        type: input.type as CouponType,
        value: input.value,
        maxDiscount: input.maxDiscount,
        minOrderValue: input.minOrderValue,
        status: (input.status as CouponStatus) || CouponStatus.ACTIVE,
        description: input.description,
        termsAndConditions: input.termsAndConditions,
        usageLimit: input.usageLimit,
        usageLimitPerUser: input.usageLimitPerUser ?? 1,
        applicableRoutes: input.applicableRoutes ? (input.applicableRoutes as any) : undefined,
        applicableOperators: input.applicableOperators ? (input.applicableOperators as any) : undefined,
        validFrom: new Date(input.validFrom),
        validUntil: new Date(input.validUntil),
        createdBy: adminId,
      },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'CREATE_COUPON',
        module: 'coupon-management',
        resourceType: 'coupon',
        resourceId: coupon.id,
        details: { code: coupon.code, type: coupon.type, value: input.value },
      },
    });

    this.logger.info({ couponId: coupon.id, adminId, code: coupon.code }, 'Coupon created');
    return coupon;
  }

  /**
   * Update coupon configuration
   */
  public async updateCoupon(id: string, input: UpdateCouponInput, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Coupon with ID '${id}' not found`);
    }

    if (input.code && input.code !== existing.code) {
      const codeConflict = await prisma.coupon.findUnique({ where: { code: input.code } });
      if (codeConflict) {
        throw new ConflictError(`Coupon code '${input.code}' already exists`);
      }
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(input.code !== undefined && { code: input.code }),
        ...(input.type !== undefined && { type: input.type as CouponType }),
        ...(input.value !== undefined && { value: input.value }),
        ...(input.maxDiscount !== undefined && { maxDiscount: input.maxDiscount }),
        ...(input.minOrderValue !== undefined && { minOrderValue: input.minOrderValue }),
        ...(input.status !== undefined && { status: input.status as CouponStatus }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.termsAndConditions !== undefined && { termsAndConditions: input.termsAndConditions }),
        ...(input.usageLimit !== undefined && { usageLimit: input.usageLimit }),
        ...(input.usageLimitPerUser !== undefined && { usageLimitPerUser: input.usageLimitPerUser }),
        ...(input.applicableRoutes !== undefined && { applicableRoutes: input.applicableRoutes as any }),
        ...(input.applicableOperators !== undefined && { applicableOperators: input.applicableOperators as any }),
        ...(input.validFrom !== undefined && { validFrom: new Date(input.validFrom) }),
        ...(input.validUntil !== undefined && { validUntil: new Date(input.validUntil) }),
      },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'UPDATE_COUPON',
        module: 'coupon-management',
        resourceType: 'coupon',
        resourceId: id,
        details: { changes: input },
      },
    });

    this.logger.info({ couponId: id, adminId }, 'Coupon updated');
    return updated;
  }

  /**
   * Deactivate a coupon
   */
  public async deactivateCoupon(id: string, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Coupon with ID '${id}' not found`);
    }

    const updated = await prisma.coupon.update({
      where: { id },
      data: { status: CouponStatus.DISABLED },
    });

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'DEACTIVATE_COUPON',
        module: 'coupon-management',
        resourceType: 'coupon',
        resourceId: id,
      },
    });

    this.logger.info({ couponId: id, adminId }, 'Coupon deactivated');
    return updated;
  }

  /**
   * Get usage history for a coupon
   */
  public async getCouponUsage(
    couponId: string,
    query: { page?: number; limit?: number }
  ): Promise<PaginatedResult<any>> {
    const prisma = getPrismaClient();

    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
      throw new NotFoundError(`Coupon with ID '${couponId}' not found`);
    }

    const { skip, take, page, limit } = buildPagination(query);

    const [total, usages] = await Promise.all([
      prisma.couponUsage.count({ where: { couponId } }),
      prisma.couponUsage.findMany({
        where: { couponId },
        skip,
        take,
        orderBy: { appliedAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: usages,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
