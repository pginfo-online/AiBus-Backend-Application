// ---------------------------------------------------------------------------
// Admin Dashboard — Service
// Platform overview, revenue, booking, user analytics + system health
// ---------------------------------------------------------------------------

import { getPrismaClient } from '../../../infrastructure/database';
import { getRedisClient, checkRedisHealth } from '../../../infrastructure/redis';
import { checkDatabaseHealth } from '../../../infrastructure/database';
import { logger } from '../../../infrastructure/logger';
import { RedisPrefix } from '../../../shared/constants';
import type { DashboardOverviewQuery, RevenueQuery, BookingAnalyticsQuery, UserAnalyticsQuery } from './dashboard.validation';

const dashboardLogger = logger.child({ module: 'admin-dashboard' });

/** Cache TTL for dashboard stats (seconds) */
const CACHE_TTL = 300; // 5 minutes

export class DashboardService {
  private static instance: DashboardService;

  private constructor() {}

  public static getInstance(): DashboardService {
    if (!DashboardService.instance) {
      DashboardService.instance = new DashboardService();
    }
    return DashboardService.instance;
  }

  /**
   * Platform overview — key metrics at a glance.
   */
  public async getOverview(query: DashboardOverviewQuery) {
    const cacheKey = `${RedisPrefix.CACHE_SEARCH}:admin:dashboard:overview:${query.period}`;

    // Try cache first
    try {
      const redis = getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        dashboardLogger.debug({ cacheHit: true }, 'Dashboard overview cache hit');
        return JSON.parse(cached);
      }
    } catch {
      // Redis unavailable — continue without cache
    }

    const prisma = getPrismaClient();
    const dateFrom = this.getDateFrom(query.period);

    // Execute all count queries in parallel for performance
    const [
      totalUsers,
      newUsers,
      totalBookings,
      periodBookings,
      confirmedBookings,
      cancelledBookings,
      pendingRefunds,
      totalRevenue,
      periodRevenue,
      activeHolds,
      totalCities,
      totalOperators,
      openTickets,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: dateFrom } } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { createdAt: { gte: dateFrom } } }),
      prisma.booking.count({ where: { status: 'CONFIRMED', createdAt: { gte: dateFrom } } }),
      prisma.booking.count({ where: { status: 'CANCELLED', createdAt: { gte: dateFrom } } }),
      prisma.refund.count({ where: { status: 'PENDING' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS', createdAt: { gte: dateFrom } } }),
      prisma.seatHold.count({ where: { status: 'ACTIVE' } }),
      prisma.city.count(),
      prisma.operator.count(),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS', 'ESCALATED'] } } }),
    ]);

    const result = {
      period: query.period,
      dateFrom: dateFrom.toISOString(),
      users: {
        total: totalUsers,
        newInPeriod: newUsers,
      },
      bookings: {
        total: totalBookings,
        inPeriod: periodBookings,
        confirmed: confirmedBookings,
        cancelled: cancelledBookings,
        conversionRate: periodBookings > 0 ? ((confirmedBookings / periodBookings) * 100).toFixed(2) : '0.00',
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        inPeriod: periodRevenue._sum.amount || 0,
      },
      operations: {
        pendingRefunds,
        activeHolds,
        openSupportTickets: openTickets,
      },
      inventory: {
        totalCities,
        totalOperators,
      },
      generatedAt: new Date().toISOString(),
    };

    // Cache the result
    try {
      const redis = getRedisClient();
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    } catch {
      // Cache write failure is non-critical
    }

    return result;
  }

  /**
   * Revenue analytics — daily/weekly/monthly revenue breakdown.
   */
  public async getRevenueAnalytics(query: RevenueQuery) {
    const prisma = getPrismaClient();
    const startDate = query.startDate ? new Date(query.startDate) : this.getDateFrom('90d');
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Group by period using raw SQL for efficient aggregation
    let dateFormat: string;
    switch (query.period) {
      case 'daily':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        dateFormat = 'IYYY-IW';
        break;
      case 'monthly':
      default:
        dateFormat = 'YYYY-MM';
        break;
    }

    const revenueData = await prisma.$queryRawUnsafe<Array<{
      period: string;
      total_revenue: number;
      total_transactions: bigint;
      avg_transaction: number;
    }>>(
      `SELECT 
        TO_CHAR(created_at, $1) AS period,
        COALESCE(SUM(amount), 0) AS total_revenue,
        COUNT(*) AS total_transactions,
        COALESCE(AVG(amount), 0) AS avg_transaction
      FROM payments
      WHERE status = 'SUCCESS'
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY period
      ORDER BY period DESC`,
      dateFormat,
      startDate,
      endDate
    );

    // Revenue by operator (top 10)
    const revenueByOperator = await prisma.$queryRawUnsafe<Array<{
      operator_name: string;
      total_revenue: number;
      booking_count: bigint;
    }>>(
      `SELECT 
        b.operator_name,
        COALESCE(SUM(p.amount), 0) AS total_revenue,
        COUNT(DISTINCT b.id) AS booking_count
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.status = 'SUCCESS'
        AND p.created_at >= $1
        AND p.created_at <= $2
      GROUP BY b.operator_name
      ORDER BY total_revenue DESC
      LIMIT 10`,
      startDate,
      endDate
    );

    return {
      period: query.period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timeline: revenueData.map((r) => ({
        period: r.period,
        revenue: Number(r.total_revenue),
        transactions: Number(r.total_transactions),
        avgTransaction: Number(Number(r.avg_transaction).toFixed(2)),
      })),
      byOperator: revenueByOperator.map((r) => ({
        operatorName: r.operator_name,
        revenue: Number(r.total_revenue),
        bookings: Number(r.booking_count),
      })),
      summary: {
        totalRevenue: revenueData.reduce((sum, r) => sum + Number(r.total_revenue), 0),
        totalTransactions: revenueData.reduce((sum, r) => sum + Number(r.total_transactions), 0),
      },
    };
  }

  /**
   * Booking analytics — status distribution, trends, conversion funnel.
   */
  public async getBookingAnalytics(query: BookingAnalyticsQuery) {
    const prisma = getPrismaClient();
    const startDate = query.startDate ? new Date(query.startDate) : this.getDateFrom('90d');
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // Status distribution
    const statusDistribution = await prisma.booking.groupBy({
      by: ['status'],
      _count: { id: true },
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Booking trends
    let dateFormat: string;
    switch (query.period) {
      case 'daily':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        dateFormat = 'IYYY-IW';
        break;
      case 'monthly':
      default:
        dateFormat = 'YYYY-MM';
        break;
    }

    const bookingTrends = await prisma.$queryRawUnsafe<Array<{
      period: string;
      total_bookings: bigint;
      confirmed: bigint;
      cancelled: bigint;
      failed: bigint;
    }>>(
      `SELECT 
        TO_CHAR(created_at, $1) AS period,
        COUNT(*) AS total_bookings,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS confirmed,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
        COUNT(*) FILTER (WHERE status IN ('BOOKING_FAILED', 'PAYMENT_FAILED')) AS failed
      FROM bookings
      WHERE created_at >= $2
        AND created_at <= $3
      GROUP BY period
      ORDER BY period DESC`,
      dateFormat,
      startDate,
      endDate
    );

    // Top routes (by booking count)
    const topRoutes = await prisma.$queryRawUnsafe<Array<{
      from_city: string;
      to_city: string;
      booking_count: bigint;
      revenue: number;
    }>>(
      `SELECT 
        from_city_name AS from_city,
        to_city_name AS to_city,
        COUNT(*) AS booking_count,
        COALESCE(SUM(total_fare), 0) AS revenue
      FROM bookings
      WHERE created_at >= $1
        AND created_at <= $2
        AND status = 'CONFIRMED'
      GROUP BY from_city_name, to_city_name
      ORDER BY booking_count DESC
      LIMIT 10`,
      startDate,
      endDate
    );

    return {
      period: query.period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      statusDistribution: statusDistribution.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      trends: bookingTrends.map((t) => ({
        period: t.period,
        total: Number(t.total_bookings),
        confirmed: Number(t.confirmed),
        cancelled: Number(t.cancelled),
        failed: Number(t.failed),
      })),
      topRoutes: topRoutes.map((r) => ({
        fromCity: r.from_city,
        toCity: r.to_city,
        bookings: Number(r.booking_count),
        revenue: Number(r.revenue),
      })),
    };
  }

  /**
   * User analytics — registration trends, user segmentation.
   */
  public async getUserAnalytics(query: UserAnalyticsQuery) {
    const prisma = getPrismaClient();
    const startDate = query.startDate ? new Date(query.startDate) : this.getDateFrom('90d');
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    // User role distribution
    const roleDistribution = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });

    // User status distribution
    const statusDistribution = await prisma.user.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // Registration trends
    let dateFormat: string;
    switch (query.period) {
      case 'daily':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        dateFormat = 'IYYY-IW';
        break;
      case 'monthly':
      default:
        dateFormat = 'YYYY-MM';
        break;
    }

    const registrationTrends = await prisma.$queryRawUnsafe<Array<{
      period: string;
      new_users: bigint;
    }>>(
      `SELECT 
        TO_CHAR(created_at, $1) AS period,
        COUNT(*) AS new_users
      FROM users
      WHERE created_at >= $2
        AND created_at <= $3
      GROUP BY period
      ORDER BY period DESC`,
      dateFormat,
      startDate,
      endDate
    );

    // Top users by bookings
    const topUsers = await prisma.$queryRawUnsafe<Array<{
      user_id: string;
      full_name: string;
      email: string;
      booking_count: bigint;
      total_spent: number;
    }>>(
      `SELECT 
        u.id AS user_id,
        u.full_name,
        u.email,
        COUNT(b.id) AS booking_count,
        COALESCE(SUM(b.total_fare), 0) AS total_spent
      FROM users u
      LEFT JOIN bookings b ON u.id = b.user_id AND b.status = 'CONFIRMED'
      GROUP BY u.id, u.full_name, u.email
      ORDER BY booking_count DESC
      LIMIT 10`
    );

    return {
      period: query.period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      roleDistribution: roleDistribution.map((r) => ({
        role: r.role,
        count: r._count.id,
      })),
      statusDistribution: statusDistribution.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      registrationTrends: registrationTrends.map((t) => ({
        period: t.period,
        newUsers: Number(t.new_users),
      })),
      topUsers: topUsers.map((u) => ({
        userId: u.user_id,
        name: u.full_name,
        email: u.email,
        bookings: Number(u.booking_count),
        totalSpent: Number(u.total_spent),
      })),
    };
  }

  /**
   * System health — DB, Redis, queue stats.
   */
  public async getSystemHealth() {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    let redisInfo: Record<string, string> = {};
    try {
      const redis = getRedisClient();
      const infoRaw = await redis.info('memory');
      const lines = infoRaw.split('\r\n');
      for (const line of lines) {
        if (line.includes(':')) {
          const [key, val] = line.split(':');
          redisInfo[key] = val;
        }
      }
    } catch {
      // Redis info unavailable
    }

    return {
      status: dbHealthy && redisHealthy ? 'healthy' : 'degraded',
      services: {
        database: {
          status: dbHealthy ? 'connected' : 'disconnected',
        },
        redis: {
          status: redisHealthy ? 'connected' : 'disconnected',
          memoryUsed: redisInfo.used_memory_human || 'unknown',
          connectedClients: redisInfo.connected_clients || 'unknown',
        },
      },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getDateFrom(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }
}
