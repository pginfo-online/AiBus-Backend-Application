"use strict";
// ---------------------------------------------------------------------------
// Admin Coupon Management — Service
// Coupon creation, updates, lifecycle control, and usage analytics
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponManagementService = void 0;
const client_1 = require("@prisma/client");
const database_1 = require("../../../infrastructure/database");
const logger_1 = require("../../../infrastructure/logger");
const errors_1 = require("../../../shared/errors");
const admin_utils_1 = require("../admin.utils");
class CouponManagementService {
    static instance;
    logger = logger_1.logger.child({ module: 'admin-coupon-management' });
    static getInstance() {
        if (!CouponManagementService.instance) {
            CouponManagementService.instance = new CouponManagementService();
        }
        return CouponManagementService.instance;
    }
    /**
     * List coupons with pagination and filtering
     */
    async listCoupons(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const { skip, take, page, limit } = (0, admin_utils_1.buildPagination)(query);
        const where = {};
        if (query.search) {
            where.OR = [
                { code: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        if (query.type) {
            where.type = query.type;
        }
        if (query.status) {
            where.status = query.status;
        }
        const orderBy = {};
        if (query.sortBy) {
            orderBy[query.sortBy] = query.sortOrder || 'desc';
        }
        else {
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
    async getCouponById(id) {
        const prisma = (0, database_1.getPrismaClient)();
        const coupon = await prisma.coupon.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { usages: true },
                },
            },
        });
        if (!coupon) {
            throw new errors_1.NotFoundError(`Coupon with ID '${id}' not found`);
        }
        return coupon;
    }
    /**
     * Create a new coupon
     */
    async createCoupon(input, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const existing = await prisma.coupon.findUnique({
            where: { code: input.code },
        });
        if (existing) {
            throw new errors_1.ConflictError(`Coupon with code '${input.code}' already exists`);
        }
        const coupon = await prisma.coupon.create({
            data: {
                code: input.code,
                type: input.type,
                value: input.value,
                maxDiscount: input.maxDiscount,
                minOrderValue: input.minOrderValue,
                status: input.status || client_1.CouponStatus.ACTIVE,
                description: input.description,
                termsAndConditions: input.termsAndConditions,
                usageLimit: input.usageLimit,
                usageLimitPerUser: input.usageLimitPerUser ?? 1,
                applicableRoutes: input.applicableRoutes ? input.applicableRoutes : undefined,
                applicableOperators: input.applicableOperators ? input.applicableOperators : undefined,
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
    async updateCoupon(id, input, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const existing = await prisma.coupon.findUnique({ where: { id } });
        if (!existing) {
            throw new errors_1.NotFoundError(`Coupon with ID '${id}' not found`);
        }
        if (input.code && input.code !== existing.code) {
            const codeConflict = await prisma.coupon.findUnique({ where: { code: input.code } });
            if (codeConflict) {
                throw new errors_1.ConflictError(`Coupon code '${input.code}' already exists`);
            }
        }
        const updated = await prisma.coupon.update({
            where: { id },
            data: {
                ...(input.code !== undefined && { code: input.code }),
                ...(input.type !== undefined && { type: input.type }),
                ...(input.value !== undefined && { value: input.value }),
                ...(input.maxDiscount !== undefined && { maxDiscount: input.maxDiscount }),
                ...(input.minOrderValue !== undefined && { minOrderValue: input.minOrderValue }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.termsAndConditions !== undefined && { termsAndConditions: input.termsAndConditions }),
                ...(input.usageLimit !== undefined && { usageLimit: input.usageLimit }),
                ...(input.usageLimitPerUser !== undefined && { usageLimitPerUser: input.usageLimitPerUser }),
                ...(input.applicableRoutes !== undefined && { applicableRoutes: input.applicableRoutes }),
                ...(input.applicableOperators !== undefined && { applicableOperators: input.applicableOperators }),
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
    async deactivateCoupon(id, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const existing = await prisma.coupon.findUnique({ where: { id } });
        if (!existing) {
            throw new errors_1.NotFoundError(`Coupon with ID '${id}' not found`);
        }
        const updated = await prisma.coupon.update({
            where: { id },
            data: { status: client_1.CouponStatus.DISABLED },
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
    async getCouponUsage(couponId, query) {
        const prisma = (0, database_1.getPrismaClient)();
        const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
        if (!coupon) {
            throw new errors_1.NotFoundError(`Coupon with ID '${couponId}' not found`);
        }
        const { skip, take, page, limit } = (0, admin_utils_1.buildPagination)(query);
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
exports.CouponManagementService = CouponManagementService;
//# sourceMappingURL=coupon-management.service.js.map