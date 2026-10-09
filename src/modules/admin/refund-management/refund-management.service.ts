// ---------------------------------------------------------------------------
// Admin Refund Management — Service
// Listing, details, manual process, retry failed refunds, refund analytics
// ---------------------------------------------------------------------------

import { RefundStatus, BookingStatus } from '@prisma/client';
import { getPrismaClient } from '../../../infrastructure/database';
import { logger } from '../../../infrastructure/logger';
import { NotFoundError, BadRequestError } from '../../../shared/errors';
import { buildPagination, buildDateFilter, PaginatedResult } from '../admin.utils';
import { ListRefundsQuery } from './refund-management.validation';
import { addJob } from '../../../infrastructure/queues';
import { QueueName } from '../../../shared/constants';

export class RefundManagementService {
  private static instance: RefundManagementService;
  private readonly logger = logger.child({ module: 'admin-refund-management' });

  public static getInstance(): RefundManagementService {
    if (!RefundManagementService.instance) {
      RefundManagementService.instance = new RefundManagementService();
    }
    return RefundManagementService.instance;
  }

  /**
   * List refunds with pagination, status filtering, and date range
   */
  public async listRefunds(query: ListRefundsQuery): Promise<PaginatedResult<any>> {
    const prisma = getPrismaClient();
    const { skip, take, page, limit } = buildPagination(query);

    const where: any = {};

    if (query.status) {
      where.status = query.status as RefundStatus;
    }

    if (query.destination) {
      where.destination = query.destination;
    }

    const dateFilter = buildDateFilter(query.startDate, query.endDate, 'createdAt');
    if (dateFilter) {
      Object.assign(where, dateFilter);
    }

    const orderBy: any = {};
    if (query.sortBy === 'amount') {
      orderBy.amount = query.sortOrder;
    } else if (query.sortBy === 'status') {
      orderBy.status = query.sortOrder;
    } else {
      orderBy.createdAt = query.sortOrder || 'desc';
    }

    const [total, refunds] = await Promise.all([
      prisma.refund.count({ where }),
      prisma.refund.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              totalAmount: true,
              status: true,
              journeyDate: true,
            },
          },
          payment: {
            select: {
              id: true,
              merchantTxnId: true,
              gatewayOrderId: true,
              gateway: true,
              amount: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          cancellation: {
            select: {
              id: true,
              seatNos: true,
              chargeAmt: true,
              refundAmount: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: refunds,
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
   * Get refund details by ID with complete relations
   */
  public async getRefundById(id: string): Promise<any> {
    const prisma = getPrismaClient();

    const refund = await prisma.refund.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            seats: true,
            passengers: true,
            ticket: true,
          },
        },
        payment: true,
        cancellation: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundError(`Refund with ID '${id}' not found`);
    }

    return refund;
  }

  /**
   * Manually process a pending/failed refund
   */
  public async processRefund(id: string, adminId: string, notes?: string): Promise<any> {
    const prisma = getPrismaClient();

    const refund = await prisma.refund.findUnique({
      where: { id },
      include: { booking: true },
    });

    if (!refund) {
      throw new NotFoundError(`Refund with ID '${id}' not found`);
    }

    if (refund.status === RefundStatus.COMPLETED) {
      throw new BadRequestError('Refund has already been completed');
    }

    // Execute within transaction
    const updatedRefund = await prisma.$transaction(async (tx) => {
      const updated = await tx.refund.update({
        where: { id },
        data: {
          status: RefundStatus.COMPLETED,
          completedAt: new Date(),
          reason: notes ? `${refund.reason} | Admin Note: ${notes}` : refund.reason,
        },
      });

      // If the booking is in REFUND_PENDING, mark as REFUNDED
      if (refund.booking && refund.booking.status === BookingStatus.REFUND_PENDING) {
        await tx.booking.update({
          where: { id: refund.bookingId },
          data: { status: BookingStatus.REFUNDED },
        });
      }

      // Record admin activity
      await tx.adminActivityLog.create({
        data: {
          adminId,
          action: 'PROCESS_REFUND',
          module: 'refund-management',
          resourceType: 'refund',
          resourceId: id,
          details: {
            previousStatus: refund.status,
            amount: refund.amount.toString(),
            notes,
          },
        },
      });

      return updated;
    });

    this.logger.info({ refundId: id, adminId, amount: refund.amount }, 'Refund manually marked as completed');
    return updatedRefund;
  }

  /**
   * Retry a failed refund via the background refund queue
   */
  public async retryRefund(id: string, adminId: string): Promise<any> {
    const prisma = getPrismaClient();

    const refund = await prisma.refund.findUnique({ where: { id } });
    if (!refund) {
      throw new NotFoundError(`Refund with ID '${id}' not found`);
    }

    if (refund.status !== RefundStatus.FAILED) {
      throw new BadRequestError(`Cannot retry refund with status '${refund.status}'. Only FAILED refunds can be retried.`);
    }

    const updated = await prisma.refund.update({
      where: { id },
      data: {
        status: RefundStatus.PENDING,
        retryCount: { increment: 1 },
      },
    });

    // Enqueue refund processing job
    try {
      await addJob(QueueName.REFUND_PROCESSING, 'process-refund', { refundId: id, retryAttempt: updated.retryCount });
    } catch (err) {
      this.logger.warn({ err, refundId: id }, 'Failed to enqueue refund background job, but status reset to PENDING');
    }

    // Record admin log
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'RETRY_REFUND',
        module: 'refund-management',
        resourceType: 'refund',
        resourceId: id,
        details: { retryCount: updated.retryCount },
      },
    });

    this.logger.info({ refundId: id, adminId, retryCount: updated.retryCount }, 'Refund re-queued for processing');
    return updated;
  }

  /**
   * Aggregate refund statistics
   */
  public async getRefundStats(): Promise<any> {
    const prisma = getPrismaClient();

    const [statusCounts, totals] = await Promise.all([
      prisma.refund.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.refund.aggregate({
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const stats: Record<string, { count: number; totalAmount: number }> = {};
    for (const group of statusCounts) {
      stats[group.status] = {
        count: group._count.id,
        totalAmount: Number(group._sum.amount ?? 0),
      };
    }

    return {
      totalRefunds: totals._count.id,
      totalRefundedAmount: Number(totals._sum.amount ?? 0),
      byStatus: stats,
    };
  }
}
