"use strict";
// ---------------------------------------------------------------------------
// Admin Booking Management — Service
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingManagementService = void 0;
const database_1 = require("../../../infrastructure/database");
const logger_1 = require("../../../infrastructure/logger");
const errors_1 = require("../../../shared/errors");
const admin_utils_1 = require("../admin.utils");
const constants_1 = require("../../../shared/constants");
const queues_1 = require("../../../infrastructure/queues");
const constants_2 = require("../../../shared/constants");
const client_1 = require("@prisma/client");
const bookingMgmtLogger = logger_1.logger.child({ module: 'admin-booking-management' });
class BookingManagementService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!BookingManagementService.instance) {
            BookingManagementService.instance = new BookingManagementService();
        }
        return BookingManagementService.instance;
    }
    /**
     * List all bookings with rich filtering.
     */
    async listBookings(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const pagination = (0, admin_utils_1.buildPagination)({ page: query.page, limit: query.limit });
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.operatorName)
            where.operatorName = { contains: query.operatorName, mode: 'insensitive' };
        if (query.fromCityName)
            where.fromCityName = { contains: query.fromCityName, mode: 'insensitive' };
        if (query.toCityName)
            where.toCityName = { contains: query.toCityName, mode: 'insensitive' };
        if (query.minAmount || query.maxAmount) {
            where.totalFare = {};
            if (query.minAmount)
                where.totalFare.gte = query.minAmount;
            if (query.maxAmount)
                where.totalFare.lte = query.maxAmount;
        }
        const dateRange = (0, admin_utils_1.buildDateRangeFilter)({ startDate: query.startDate, endDate: query.endDate });
        if (dateRange)
            where.createdAt = dateRange;
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
        return { bookings, pagination: (0, admin_utils_1.buildPaginationMeta)(total, pagination) };
    }
    /**
     * Get full booking details with all relations.
     */
    async getBookingDetails(bookingId) {
        const prisma = (0, database_1.getPrismaClient)();
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
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        role: true,
                        status: true,
                    },
                },
            },
        });
        if (!booking)
            throw new errors_1.NotFoundError('Booking', bookingId);
        return booking;
    }
    /**
     * Admin status override — manually transition booking status with validation.
     */
    async updateBookingStatus(bookingId, data, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new errors_1.NotFoundError('Booking', bookingId);
        const newStatus = data.status;
        const currentStatus = booking.status;
        // Validate state transition (admin can force transitions not in normal flow)
        // But still log warnings for unusual transitions
        const allowedTransitions = constants_1.VALID_BOOKING_TRANSITIONS[currentStatus];
        if (allowedTransitions && !allowedTransitions.includes(newStatus)) {
            bookingMgmtLogger.warn({ bookingId, from: currentStatus, to: newStatus, adminId }, 'Admin forcing non-standard booking state transition');
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
        bookingMgmtLogger.info({ bookingId, from: currentStatus, to: newStatus, adminId }, 'Booking status overridden by admin');
        return updatedBooking;
    }
    /**
     * Admin-initiated cancellation with optional refund.
     */
    async adminCancelBooking(bookingId, data, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { payments: true, seats: true },
        });
        if (!booking)
            throw new errors_1.NotFoundError('Booking', bookingId);
        // Only cancel bookings that are in a cancellable state
        const cancellableStatuses = [
            client_1.BookingStatus.CONFIRMED,
            client_1.BookingStatus.HELD,
            client_1.BookingStatus.PAYMENT_PENDING,
            client_1.BookingStatus.PAYMENT_SUCCESS,
            client_1.BookingStatus.BOOKING_REQUESTED,
        ];
        if (!cancellableStatuses.includes(booking.status)) {
            throw new errors_1.ValidationError(`Cannot cancel booking in ${booking.status} status. Cancellable statuses: ${cancellableStatuses.join(', ')}`);
        }
        const cancelledBooking = await prisma.$transaction(async (tx) => {
            // Update booking status
            const updated = await tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: client_1.BookingStatus.CANCELLED,
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
                await (0, queues_1.addJob)(constants_2.QueueName.REFUND_PROCESSING, `admin-refund-${bookingId}`, {
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
        bookingMgmtLogger.info({ bookingId, adminId, reason: data.reason }, 'Booking cancelled by admin');
        return cancelledBooking;
    }
    /**
     * Trigger manual reconciliation for stuck/unknown bookings.
     */
    async reconcileBooking(bookingId, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new errors_1.NotFoundError('Booking', bookingId);
        // Queue reconciliation job
        await (0, queues_1.addJob)(constants_2.QueueName.BOOKING_RECONCILIATION, `admin-reconcile-${bookingId}`, {
            bookingId,
            providerHoldId: booking.providerHoldId,
            initiatedBy: adminId,
            isAdminTriggered: true,
        }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
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
        bookingMgmtLogger.info({ bookingId, adminId }, 'Booking reconciliation triggered by admin');
        return {
            message: 'Reconciliation job queued',
            bookingId,
            currentStatus: booking.status,
        };
    }
    /**
     * Get booking statistics.
     */
    async getBookingStats() {
        const prisma = (0, database_1.getPrismaClient)();
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
exports.BookingManagementService = BookingManagementService;
//# sourceMappingURL=booking-management.service.js.map