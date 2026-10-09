// ---------------------------------------------------------------------------
// Admin User Management — Service
// ---------------------------------------------------------------------------

import { getPrismaClient } from '../../../infrastructure/database';
import { logger } from '../../../infrastructure/logger';
import { NotFoundError, AuthorizationError, ValidationError } from '../../../shared/errors';
import { buildPagination, buildPaginationMeta, buildDateRangeFilter } from '../admin.utils';
import type { ListUsersQuery, UpdateUserBody, SuspendUserBody } from './user-management.validation';
import { UserRole } from '../../../shared/constants';
import { Prisma } from '@prisma/client';

const userMgmtLogger = logger.child({ module: 'admin-user-management' });

export class UserManagementService {
  private static instance: UserManagementService;

  private constructor() {}

  public static getInstance(): UserManagementService {
    if (!UserManagementService.instance) {
      UserManagementService.instance = new UserManagementService();
    }
    return UserManagementService.instance;
  }

  /**
   * List all users with pagination, filtering, search, and sorting.
   */
  public async listUsers(query: ListUsersQuery) {
    const prisma = getPrismaClient();
    const pagination = buildPagination({ page: query.page, limit: query.limit });

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (query.role) where.role = query.role as any;
    if (query.status) where.status = query.status as any;

    const dateRange = buildDateRangeFilter({ startDate: query.startDate, endDate: query.endDate });
    if (dateRange) where.createdAt = dateRange;

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

    const meta = buildPaginationMeta(total, pagination);
    return { users, pagination: meta };
  }

  /**
   * Get full user details including activity summary.
   */
  public async getUserDetails(userId: string) {
    const prisma = getPrismaClient();

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

    if (!user) throw new NotFoundError('User', userId);

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
  public async updateUser(userId: string, data: UpdateUserBody, adminRole: string) {
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User', userId);

    // Only SUPER_ADMIN can promote to ADMIN or SUPER_ADMIN
    if (data.role && ['ADMIN', 'SUPER_ADMIN'].includes(data.role)) {
      if (adminRole !== UserRole.SUPER_ADMIN) {
        throw new AuthorizationError('Only SUPER_ADMIN can assign admin roles');
      }
    }

    // Prevent demoting SUPER_ADMIN unless you are SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' && data.role && data.role !== 'SUPER_ADMIN') {
      if (adminRole !== UserRole.SUPER_ADMIN) {
        throw new AuthorizationError('Cannot modify SUPER_ADMIN user');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.role !== undefined && { role: data.role as any }),
        ...(data.status !== undefined && { status: data.status as any }),
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

    userMgmtLogger.info(
      { userId, updatedFields: Object.keys(data) },
      'Admin updated user'
    );

    return updatedUser;
  }

  /**
   * Suspend a user account with reason.
   */
  public async suspendUser(userId: string, data: SuspendUserBody, adminId: string) {
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User', userId);

    if (user.status === 'SUSPENDED') {
      throw new ValidationError('User is already suspended');
    }

    // Prevent suspending SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN') {
      throw new AuthorizationError('Cannot suspend SUPER_ADMIN user');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
      select: {
        id: true,
        fullName: true,
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

    userMgmtLogger.info(
      { userId, adminId, reason: data.reason },
      'User suspended by admin'
    );

    return updatedUser;
  }

  /**
   * Activate a suspended/deactivated user.
   */
  public async activateUser(userId: string, adminId: string) {
    const prisma = getPrismaClient();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User', userId);

    if (user.status === 'ACTIVE') {
      throw new ValidationError('User is already active');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
      select: {
        id: true,
        fullName: true,
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
  public async getUserBookings(userId: string, page = 1, limit = 20) {
    const prisma = getPrismaClient();
    const pagination = buildPagination({ page, limit });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundError('User', userId);

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

    return { bookings, pagination: buildPaginationMeta(total, pagination) };
  }

  /**
   * Get user's payment history.
   */
  public async getUserPayments(userId: string, page = 1, limit = 20) {
    const prisma = getPrismaClient();
    const pagination = buildPagination({ page, limit });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundError('User', userId);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.payment.count({ where: { userId } }),
    ]);

    return { payments, pagination: buildPaginationMeta(total, pagination) };
  }

  /**
   * Get user's wallet transactions.
   */
  public async getUserWallet(userId: string, page = 1, limit = 20) {
    const prisma = getPrismaClient();
    const pagination = buildPagination({ page, limit });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundError('User', userId);

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.walletTransaction.count({ where: { userId } }),
    ]);

    return { transactions, pagination: buildPaginationMeta(total, pagination) };
  }
}
