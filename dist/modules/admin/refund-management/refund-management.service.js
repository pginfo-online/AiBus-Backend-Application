"use strict";
// ---------------------------------------------------------------------------
// Admin Refund Management — Service
// Listing, details, manual process, retry failed refunds, refund analytics
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundManagementService = void 0;
const client_1 = require("@prisma/client");
const database_1 = require("../../../infrastructure/database");
const logger_1 = require("../../../infrastructure/logger");
const errors_1 = require("../../../shared/errors");
const admin_utils_1 = require("../admin.utils");
const queues_1 = require("../../../infrastructure/queues");
const constants_1 = require("../../../shared/constants");
class RefundManagementService {
    static instance;
    logger = logger_1.logger.child({ module: 'admin-refund-management' });
    static getInstance() {
        if (!RefundManagementService.instance) {
            RefundManagementService.instance = new RefundManagementService();
        }
        return RefundManagementService.instance;
    }
    /**
     * List refunds with pagination, status filtering, and date range
     */
    async listRefunds(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const { skip, take, page, limit } = (0, admin_utils_1.buildPagination)(query);
        const where = {};
        if (query.status) {
            where.status = query.status;
        }
        if (query.destination) {
            where.destination = query.destination;
        }
        const dateFilter = (0, admin_utils_1.buildDateFilter)(query.startDate, query.endDate, 'createdAt');
        if (dateFilter) {
            Object.assign(where, dateFilter);
        }
        const orderBy = {};
        if (query.sortBy === 'amount') {
            orderBy.amount = query.sortOrder;
        }
        else if (query.sortBy === 'status') {
            orderBy.status = query.sortOrder;
        }
        else {
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
                            totalFare: true,
                            contactName: true,
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
    async getRefundById(id) {
        const prisma = (0, database_1.getPrismaClient)();
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
            throw new errors_1.NotFoundError(`Refund with ID '${id}' not found`);
        }
        return refund;
    }
    /**
     * Manually process a pending/failed refund
     */
    async processRefund(id, adminId, notes) {
        const prisma = (0, database_1.getPrismaClient)();
        const refund = await prisma.refund.findUnique({
            where: { id },
            include: { booking: true },
        });
        if (!refund) {
            throw new errors_1.NotFoundError(`Refund with ID '${id}' not found`);
        }
        if (refund.status === client_1.RefundStatus.COMPLETED) {
            throw new errors_1.BadRequestError('Refund has already been completed');
        }
        // Execute within transaction
        const updatedRefund = await prisma.$transaction(async (tx) => {
            const updated = await tx.refund.update({
                where: { id },
                data: {
                    status: client_1.RefundStatus.COMPLETED,
                    completedAt: new Date(),
                    reason: notes ? `${refund.reason} | Admin Note: ${notes}` : refund.reason,
                },
            });
            // If the booking is in REFUND_PENDING, mark as REFUNDED
            if (refund.booking && refund.booking.status === client_1.BookingStatus.REFUND_PENDING) {
                await tx.booking.update({
                    where: { id: refund.bookingId },
                    data: { status: client_1.BookingStatus.REFUNDED },
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
    async retryRefund(id, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const refund = await prisma.refund.findUnique({ where: { id } });
        if (!refund) {
            throw new errors_1.NotFoundError(`Refund with ID '${id}' not found`);
        }
        if (refund.status !== client_1.RefundStatus.FAILED) {
            throw new errors_1.BadRequestError(`Cannot retry refund with status '${refund.status}'. Only FAILED refunds can be retried.`);
        }
        const updated = await prisma.refund.update({
            where: { id },
            data: {
                status: client_1.RefundStatus.PENDING,
                retryCount: { increment: 1 },
            },
        });
        // Enqueue refund processing job
        try {
            await (0, queues_1.addJob)(constants_1.QueueName.REFUND_PROCESSING, 'process-refund', { refundId: id, retryAttempt: updated.retryCount });
        }
        catch (err) {
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
    async getRefundStats() {
        const prisma = (0, database_1.getPrismaClient)();
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
        const stats = {};
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
exports.RefundManagementService = RefundManagementService;
//# sourceMappingURL=refund-management.service.js.map