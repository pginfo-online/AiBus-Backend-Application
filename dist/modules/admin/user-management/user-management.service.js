"use strict";
// ---------------------------------------------------------------------------
// Admin User Management — Service
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManagementService = void 0;
const database_1 = require("../../../infrastructure/database");
const logger_1 = require("../../../infrastructure/logger");
const errors_1 = require("../../../shared/errors");
const admin_utils_1 = require("../admin.utils");
const constants_1 = require("../../../shared/constants");
const userMgmtLogger = logger_1.logger.child({ module: 'admin-user-management' });
class UserManagementService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!UserManagementService.instance) {
            UserManagementService.instance = new UserManagementService();
        }
        return UserManagementService.instance;
    }
    /**
     * List all users with pagination, filtering, search, and sorting.
     */
    async listUsers(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const pagination = (0, admin_utils_1.buildPagination)({ page: query.page, limit: query.limit });
        // Build where clause
        const where = {};
        if (query.role)
            where.role = query.role;
        if (query.status)
            where.status = query.status;
        const dateRange = (0, admin_utils_1.buildDateRangeFilter)({ startDate: query.startDate, endDate: query.endDate });
        if (dateRange)
            where.createdAt = dateRange;
        if (query.search) {
            where.OR = [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { phone: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    role: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: { bookings: true },
                    },
                },
                orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
                skip: pagination.skip,
                take: pagination.take,
            }),
            prisma.user.count({ where }),
        ]);
        const meta = (0, admin_utils_1.buildPaginationMeta)(total, pagination);
        return { users, pagination: meta };
    }
    /**
     * Get full user details including activity summary.
     */
    async getUserDetails(userId) {
        const prisma = (0, database_1.getPrismaClient)();
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        bookings: true,
                        payments: true,
                        walletTransactions: true,
                        notifications: true,
                    },
                },
            },
        });
        if (!user)
            throw new errors_1.NotFoundError('User', userId);
        // Get booking summary
        const bookingSummary = await prisma.booking.aggregate({
            where: { userId },
            _count: { id: true },
            _sum: { totalFare: true },
        });
        // Get recent bookings
        const recentBookings = await prisma.booking.findMany({
            where: { userId },
            select: {
                id: true,
                bookingNumber: true,
                status: true,
                totalFare: true,
                fromCityName: true,
                toCityName: true,
                journeyDate: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        return {
            ...user,
            activity: {
                totalBookings: bookingSummary._count.id,
                totalSpent: bookingSummary._sum.totalFare || 0,
                recentBookings,
            },
        };
    }
    /**
     * Admin update user profile/role/status.
     * SUPER_ADMIN-only for role changes to ADMIN/SUPER_ADMIN.
     */
    async updateUser(userId, data, adminRole) {
        const prisma = (0, database_1.getPrismaClient)();
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new errors_1.NotFoundError('User', userId);
        // Only SUPER_ADMIN can promote to ADMIN or SUPER_ADMIN
        if (data.role && ['ADMIN', 'SUPER_ADMIN'].includes(data.role)) {
            if (adminRole !== constants_1.UserRole.SUPER_ADMIN) {
                throw new errors_1.AuthorizationError('Only SUPER_ADMIN can assign admin roles');
            }
        }
        // Prevent demoting SUPER_ADMIN unless you are SUPER_ADMIN
        if (user.role === 'SUPER_ADMIN' && data.role && data.role !== 'SUPER_ADMIN') {
            if (adminRole !== constants_1.UserRole.SUPER_ADMIN) {
                throw new errors_1.AuthorizationError('Cannot modify SUPER_ADMIN user');
            }
        }
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(data.firstName !== undefined && { firstName: data.firstName }),
                ...(data.lastName !== undefined && { lastName: data.lastName }),
                ...(data.phone !== undefined && { phone: data.phone }),
                ...(data.role !== undefined && { role: data.role }),
                ...(data.status !== undefined && { status: data.status }),
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        userMgmtLogger.info({ userId, updatedFields: Object.keys(data) }, 'Admin updated user');
        return updatedUser;
    }
    /**
     * Suspend a user account with reason.
     */
    async suspendUser(userId, data, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new errors_1.NotFoundError('User', userId);
        if (user.status === 'SUSPENDED') {
            throw new errors_1.ValidationError('User is already suspended');
        }
        // Prevent suspending SUPER_ADMIN
        if (user.role === 'SUPER_ADMIN') {
            throw new errors_1.AuthorizationError('Cannot suspend SUPER_ADMIN user');
        }
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { status: 'SUSPENDED' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                status: true,
                updatedAt: true,
            },
        });
        // Record audit log
        await prisma.adminActivityLog.create({
            data: {
                adminId,
                action: 'USER_SUSPENDED',
                module: 'user-management',
                resourceType: 'user',
                resourceId: userId,
                details: { reason: data.reason, previousStatus: user.status },
            },
        }).catch((err) => {
            userMgmtLogger.error({ err: err.message }, 'Failed to record suspend audit log');
        });
        userMgmtLogger.info({ userId, adminId, reason: data.reason }, 'User suspended by admin');
        return updatedUser;
    }
    /**
     * Activate a suspended/deactivated user.
     */
    async activateUser(userId, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new errors_1.NotFoundError('User', userId);
        if (user.status === 'ACTIVE') {
            throw new errors_1.ValidationError('User is already active');
        }
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { status: 'ACTIVE' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                status: true,
                updatedAt: true,
            },
        });
        await prisma.adminActivityLog.create({
            data: {
                adminId,
                action: 'USER_ACTIVATED',
                module: 'user-management',
                resourceType: 'user',
                resourceId: userId,
                details: { previousStatus: user.status },
            },
        }).catch((err) => {
            userMgmtLogger.error({ err: err.message }, 'Failed to record activate audit log');
        });
        userMgmtLogger.info({ userId, adminId }, 'User activated by admin');
        return updatedUser;
    }
    /**
     * Get user's booking history (admin view).
     */
    async getUserBookings(userId, page = 1, limit = 20) {
        const prisma = (0, database_1.getPrismaClient)();
        const pagination = (0, admin_utils_1.buildPagination)({ page, limit });
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user)
            throw new errors_1.NotFoundError('User', userId);
        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where: { userId },
                include: {
                    seats: true,
                    passengers: true,
                    payments: true,
                    ticket: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
            }),
            prisma.booking.count({ where: { userId } }),
        ]);
        return { bookings, pagination: (0, admin_utils_1.buildPaginationMeta)(total, pagination) };
    }
    /**
     * Get user's payment history.
     */
    async getUserPayments(userId, page = 1, limit = 20) {
        const prisma = (0, database_1.getPrismaClient)();
        const pagination = (0, admin_utils_1.buildPagination)({ page, limit });
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user)
            throw new errors_1.NotFoundError('User', userId);
        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
            }),
            prisma.payment.count({ where: { userId } }),
        ]);
        return { payments, pagination: (0, admin_utils_1.buildPaginationMeta)(total, pagination) };
    }
    /**
     * Get user's wallet transactions.
     */
    async getUserWallet(userId, page = 1, limit = 20) {
        const prisma = (0, database_1.getPrismaClient)();
        const pagination = (0, admin_utils_1.buildPagination)({ page, limit });
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user)
            throw new errors_1.NotFoundError('User', userId);
        const [transactions, total] = await Promise.all([
            prisma.walletTransaction.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
            }),
            prisma.walletTransaction.count({ where: { userId } }),
        ]);
        return { transactions, pagination: (0, admin_utils_1.buildPaginationMeta)(total, pagination) };
    }
}
exports.UserManagementService = UserManagementService;
//# sourceMappingURL=user-management.service.js.map