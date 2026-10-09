// ---------------------------------------------------------------------------
// Admin Payment Management — Service
// ---------------------------------------------------------------------------

import { getPrismaClient } from '../../../infrastructure/database';
import { logger } from '../../../infrastructure/logger';
import { NotFoundError } from '../../../shared/errors';
import { buildPagination, buildPaginationMeta, buildDateRangeFilter } from '../admin.utils';
import { addJob } from '../../../infrastructure/queues';
import { QueueName } from '../../../shared/constants';
import type { ListPaymentsQuery } from './payment-management.validation';
import { Prisma } from '@prisma/client';

const paymentMgmtLogger = logger.child({ module: 'admin-payment-management' });

export class PaymentManagementService {
  private static instance: PaymentManagementService;

  private constructor() {}

  public static getInstance(): PaymentManagementService {
    if (!PaymentManagementService.instance) {
      PaymentManagementService.instance = new PaymentManagementService();
    }
    return PaymentManagementService.instance;
  }

  /**
   * List all payments with filtering.
   */
  public async listPayments(query: ListPaymentsQuery) {
    const prisma = getPrismaClient();
    const pagination = buildPagination({ page: query.page, limit: query.limit });

    const where: Prisma.PaymentWhereInput = {};

    if (query.status) where.status = query.status as any;
    if (query.gateway) where.gateway = { contains: query.gateway, mode: 'insensitive' };

    const dateRange = buildDateRangeFilter({ startDate: query.startDate, endDate: query.endDate });
    if (dateRange) where.createdAt = dateRange;

    if (query.search) {
      where.OR = [
        { gatewayOrderId: { contains: query.search, mode: 'insensitive' } },
        { gatewayPaymentId: { contains: query.search, mode: 'insensitive' } },
        { booking: { bookingNumber: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              contactName: true,
              contactEmail: true,
              status: true,
            },
          },
        },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, pagination: buildPaginationMeta(total, pagination) };
  }

  /**
   * Get payment details.
   */
  public async getPaymentDetails(paymentId: string) {
    const prisma = getPrismaClient();

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            seats: true,
            passengers: true,
            cancellations: true,
            refunds: true,
          },
        },
      },
    });

    if (!payment) throw new NotFoundError('Payment', paymentId);
    return payment;
  }

  /**
   * Manual payment reconciliation — queues a reconciliation job.
   */
  public async reconcilePayment(paymentId: string, adminId: string) {
    const prisma = getPrismaClient();

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment', paymentId);

    await addJob(
      QueueName.PAYMENT_RECONCILIATION,
      `admin-payment-reconcile-${paymentId}`,
      {
        paymentId,
        bookingId: payment.bookingId,
        gatewayOrderId: payment.gatewayOrderId,
        initiatedBy: adminId,
        isAdminTriggered: true,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'PAYMENT_RECONCILIATION_TRIGGERED',
        module: 'payment-management',
        resourceType: 'payment',
        resourceId: paymentId,
        details: { currentStatus: payment.status, bookingId: payment.bookingId },
      },
    }).catch((err) => {
      paymentMgmtLogger.error({ err: err.message }, 'Failed to record reconciliation audit');
    });

    paymentMgmtLogger.info({ paymentId, adminId }, 'Payment reconciliation triggered by admin');

    return {
      message: 'Payment reconciliation job queued',
      paymentId,
      currentStatus: payment.status,
    };
  }

  /**
   * Payment statistics.
   */
  public async getPaymentStats() {
    const prisma = getPrismaClient();

    const [statusCounts, totalSuccess, todaySuccess] = await Promise.all([
      prisma.payment.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: { status: 'SUCCESS' },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true },
        where: {
          status: 'SUCCESS',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return {
      statusDistribution: statusCounts.map((s) => ({
        status: s.status,
        count: s._count.id,
        totalAmount: s._sum.amount || 0,
      })),
      totalSuccessful: {
        count: totalSuccess._count.id,
        amount: totalSuccess._sum.amount || 0,
      },
      todaySuccessful: {
        count: todaySuccess._count.id,
        amount: todaySuccess._sum.amount || 0,
      },
    };
  }
}
