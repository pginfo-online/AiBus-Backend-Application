"use strict";
// ---------------------------------------------------------------------------
// Admin Payment Management — Service
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentManagementService = void 0;
const database_1 = require("../../../infrastructure/database");
const logger_1 = require("../../../infrastructure/logger");
const errors_1 = require("../../../shared/errors");
const admin_utils_1 = require("../admin.utils");
const queues_1 = require("../../../infrastructure/queues");
const constants_1 = require("../../../shared/constants");
const paymentMgmtLogger = logger_1.logger.child({ module: 'admin-payment-management' });
class PaymentManagementService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!PaymentManagementService.instance) {
            PaymentManagementService.instance = new PaymentManagementService();
        }
        return PaymentManagementService.instance;
    }
    /**
     * List all payments with filtering.
     */
    async listPayments(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const pagination = (0, admin_utils_1.buildPagination)({ page: query.page, limit: query.limit });
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.gateway)
            where.gateway = { contains: query.gateway, mode: 'insensitive' };
        const dateRange = (0, admin_utils_1.buildDateRangeFilter)({ startDate: query.startDate, endDate: query.endDate });
        if (dateRange)
            where.createdAt = dateRange;
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
        return { payments, pagination: (0, admin_utils_1.buildPaginationMeta)(total, pagination) };
    }
    /**
     * Get payment details.
     */
    async getPaymentDetails(paymentId) {
        const prisma = (0, database_1.getPrismaClient)();
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
        if (!payment)
            throw new errors_1.NotFoundError('Payment', paymentId);
        return payment;
    }
    /**
     * Manual payment reconciliation — queues a reconciliation job.
     */
    async reconcilePayment(paymentId, adminId) {
        const prisma = (0, database_1.getPrismaClient)();
        const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment)
            throw new errors_1.NotFoundError('Payment', paymentId);
        await (0, queues_1.addJob)(constants_1.QueueName.PAYMENT_RECONCILIATION, `admin-payment-reconcile-${paymentId}`, {
            paymentId,
            bookingId: payment.bookingId,
            gatewayOrderId: payment.gatewayOrderId,
            initiatedBy: adminId,
            isAdminTriggered: true,
        }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
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
    async getPaymentStats() {
        const prisma = (0, database_1.getPrismaClient)();
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
exports.PaymentManagementService = PaymentManagementService;
//# sourceMappingURL=payment-management.service.js.map