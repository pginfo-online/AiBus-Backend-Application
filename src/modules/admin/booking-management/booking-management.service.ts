// ---------------------------------------------------------------------------
// Admin Booking Management — Service
// ---------------------------------------------------------------------------

import { getPrismaClient } from '../../../infrastructure/database';
import { logger } from '../../../infrastructure/logger';
import { NotFoundError, ValidationError, InvalidStateTransitionError } from '../../../shared/errors';
import { buildPagination, buildPaginationMeta, buildDateRangeFilter } from '../admin.utils';
import { VALID_BOOKING_TRANSITIONS } from '../../../shared/constants';
import { addJob } from '../../../infrastructure/queues';
import { QueueName } from '../../../shared/constants';
import type { ListBookingsQuery, UpdateBookingStatusBody, AdminCancelBookingBody } from './booking-management.validation';
import { Prisma, BookingStatus } from '@prisma/client';

const bookingMgmtLogger = logger.child({ module: 'admin-booking-management' });

export class BookingManagementService {
  private static instance: BookingManagementService;

  private constructor() {}

  public static getInstance(): BookingManagementService {
    if (!BookingManagementService.instance) {
      BookingManagementService.instance = new BookingManagementService();
    }
    return BookingManagementService.instance;
  }

  /**
   * List all bookings with rich filtering.
   */
  public async listBookings(query: ListBookingsQuery) {
    const prisma = getPrismaClient();
    const pagination = buildPagination({ page: query.page, limit: query.limit });

    const where: Prisma.BookingWhereInput = {};

    if (query.status) where.status = query.status as BookingStatus;
    if (query.operatorName) where.operatorName = { contains: query.operatorName, mode: 'insensitive' };
    if (query.fromCityName) where.fromCityName = { contains: query.fromCityName, mode: 'insensitive' };
    if (query.toCityName) where.toCityName = { contains: query.toCityName, mode: 'insensitive' };

    if (query.minAmount || query.maxAmount) {
      where.totalFare = {};
      if (query.minAmount) (where.totalFare as any).gte = query.minAmount;
      if (query.maxAmount) (where.totalFare as any).lte = query.maxAmount;
    }

    const dateRange = buildDateRangeFilter({ startDate: query.startDate, endDate: query.endDate });
    if (dateRange) where.createdAt = dateRange;

    if (query.search) {
      where.OR = [
        { bookingNumber: { contains: query.search, mode: 'insensitive' } },
        { contactName: { contains: query.search, mode: 'insensitive' } },
        { contactEmail: { contains: query.search, mode: 'insensitive' } },
        { contactPhone: { contains: query.search } },
        { providerTicketNo: { contains: query.search, mode: 'insensitive' } },
        { providerPnrNo: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          totalFare: true,
          fromCityName: true,
          toCityName: true,
          journeyDate: true,
          operatorName: true,
          busType: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          providerTicketNo: true,
          providerPnrNo: true,
          confirmedAt: true,
          createdAt: true,
          userId: true,
          _count: {
            select: { seats: true, passengers: true },
          },
        },
        orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, pagination: buildPaginationMeta(total, pagination) };
  }

  /**
   * Get full booking details with all relations.
   */
  public async getBookingDetails(bookingId: string) {
    const prisma = getPrismaClient();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        seats: true,
        passengers: true,
        payments: true,
        ticket: true,
        cancellations: true,
        refunds: true,
        holds: true,
        providerTransactions: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (!booking) throw new NotFoundError('Booking', bookingId);
    return booking;
  }

  /**
   * Admin status override — manually transition booking status with validation.
   */
  public async updateBookingStatus(
    bookingId: string,
    data: UpdateBookingStatusBody,
    adminId: string
  ) {
    const prisma = getPrismaClient();

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundError('Booking', bookingId);

    const newStatus = data.status as BookingStatus;
    const currentStatus = booking.status;

    // Validate state transition (admin can force transitions not in normal flow)
    // But still log warnings for unusual transitions
    const allowedTransitions = VALID_BOOKING_TRANSITIONS[currentStatus as keyof typeof VALID_BOOKING_TRANSITIONS];
    if (allowedTransitions && !allowedTransitions.includes(newStatus as any)) {
      bookingMgmtLogger.warn(
        { bookingId, from: currentStatus, to: newStatus, adminId },
        'Admin forcing non-standard booking state transition'
      );
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: newStatus,
        version: { increment: 1 },
      },
      include: {
        seats: true,
        passengers: true,
      },
    });

    // Record audit
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'BOOKING_STATUS_OVERRIDE',
        module: 'booking-management',
        resourceType: 'booking',
        resourceId: bookingId,
        details: {
          from: currentStatus,
          to: newStatus,
          reason: data.reason,
          bookingNumber: booking.bookingNumber,
        },
      },
    }).catch((err) => {
      bookingMgmtLogger.error({ err: err.message }, 'Failed to record status override audit log');
    });

    bookingMgmtLogger.info(
      { bookingId, from: currentStatus, to: newStatus, adminId },
      'Booking status overridden by admin'
    );

    return updatedBooking;
  }

  /**
   * Admin-initiated cancellation with optional refund.
   */
  public async adminCancelBooking(
    bookingId: string,
    data: AdminCancelBookingBody,
    adminId: string
  ) {
    const prisma = getPrismaClient();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true, seats: true },
    });
    if (!booking) throw new NotFoundError('Booking', bookingId);

    // Only cancel bookings that are in a cancellable state
    const cancellableStatuses: BookingStatus[] = [
      BookingStatus.CONFIRMED,
      BookingStatus.HELD,
      BookingStatus.PAYMENT_PENDING,
      BookingStatus.PAYMENT_SUCCESS,
      BookingStatus.BOOKING_REQUESTED,
    ];

    if (!cancellableStatuses.includes(booking.status)) {
      throw new ValidationError(
        `Cannot cancel booking in ${booking.status} status. Cancellable statuses: ${cancellableStatuses.join(', ')}`
      );
    }

    const cancelledBooking = await prisma.$transaction(async (tx) => {
      // Update booking status
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          version: { increment: 1 },
        },
        include: { seats: true, passengers: true },
      });

      // Create cancellation record
      await tx.cancellation.create({
        data: {
          bookingId,
          userId: booking.userId,
          seatNos: booking.seats.map((s) => s.seatNo),
          chargePct: 0,
          chargeAmt: 0,
          refundAmount: booking.totalFare,
          totalFare: booking.totalFare,
          reason: `Admin cancellation: ${data.reason}`,
          status: 'COMPLETED',
        },
      });

      return updated;
    });

    // Queue refund if requested and there was a successful payment
    if (data.initiateRefund) {
      const successPayment = booking.payments.find((p) => p.status === 'SUCCESS');
      if (successPayment) {
        await addJob(QueueName.REFUND_PROCESSING, `admin-refund-${bookingId}`, {
          bookingId,
          paymentId: successPayment.id,
          amount: Number(successPayment.amount),
          reason: `Admin-initiated cancellation: ${data.reason}`,
          initiatedBy: adminId,
        }).catch((err) => {
          bookingMgmtLogger.error({ err: err.message, bookingId }, 'Failed to queue refund job');
        });
      }
    }

    // Audit log
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'BOOKING_ADMIN_CANCELLED',
        module: 'booking-management',
        resourceType: 'booking',
        resourceId: bookingId,
        details: {
          reason: data.reason,
          initiateRefund: data.initiateRefund,
          bookingNumber: booking.bookingNumber,
        },
      },
    }).catch((err) => {
      bookingMgmtLogger.error({ err: err.message }, 'Failed to record cancel audit log');
    });

    bookingMgmtLogger.info(
      { bookingId, adminId, reason: data.reason },
      'Booking cancelled by admin'
    );

    return cancelledBooking;
  }

  /**
   * Trigger manual reconciliation for stuck/unknown bookings.
   */
  public async reconcileBooking(bookingId: string, adminId: string) {
    const prisma = getPrismaClient();

    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundError('Booking', bookingId);

    // Queue reconciliation job
    await addJob(
      QueueName.BOOKING_RECONCILIATION,
      `admin-reconcile-${bookingId}`,
      {
        bookingId,
        providerHoldId: booking.providerHoldId,
        initiatedBy: adminId,
        isAdminTriggered: true,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    // Audit log
    await prisma.adminActivityLog.create({
      data: {
        adminId,
        action: 'BOOKING_RECONCILIATION_TRIGGERED',
        module: 'booking-management',
        resourceType: 'booking',
        resourceId: bookingId,
        details: {
          currentStatus: booking.status,
          bookingNumber: booking.bookingNumber,
        },
      },
    }).catch((err) => {
      bookingMgmtLogger.error({ err: err.message }, 'Failed to record reconciliation audit log');
    });

    bookingMgmtLogger.info(
      { bookingId, adminId },
      'Booking reconciliation triggered by admin'
    );

    return {
      message: 'Reconciliation job queued',
      bookingId,
      currentStatus: booking.status,
    };
  }

  /**
   * Get booking statistics.
   */
  public async getBookingStats() {
    const prisma = getPrismaClient();

    const [statusCounts, todayCount, totalRevenue] = await Promise.all([
      prisma.booking.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.booking.aggregate({
        _sum: { totalFare: true },
        where: { status: 'CONFIRMED' },
      }),
    ]);

    return {
      statusDistribution: statusCounts.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      todayBookings: todayCount,
      totalConfirmedRevenue: totalRevenue._sum.totalFare || 0,
    };
  }
}
