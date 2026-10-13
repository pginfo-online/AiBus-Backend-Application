"use strict";
// ---------------------------------------------------------------------------
// Admin Report Management — Service
// Analytical reporting & dataset generation for CSV exports
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const database_1 = require("../../../infrastructure/database");
const logger_1 = require("../../../infrastructure/logger");
const admin_utils_1 = require("../admin.utils");
class ReportService {
    static instance;
    logger = logger_1.logger.child({ module: 'admin-report' });
    static getInstance() {
        if (!ReportService.instance) {
            ReportService.instance = new ReportService();
        }
        return ReportService.instance;
    }
    /**
     * Revenue analytics report
     */
    async getRevenueReport(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const where = {
            status: 'CONFIRMED',
        };
        if (query.operatorName) {
            where.operatorName = { contains: query.operatorName, mode: 'insensitive' };
        }
        const dateFilter = (0, admin_utils_1.buildDateFilter)(query.startDate, query.endDate, 'createdAt');
        if (dateFilter) {
            Object.assign(where, dateFilter);
        }
        const bookings = await prisma.booking.findMany({
            where,
            select: {
                id: true,
                bookingNumber: true,
                operatorName: true,
                baseFare: true,
                serviceTax: true,
                convenienceFee: true,
                discountAmount: true,
                totalFare: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5000,
        });
        return bookings.map((b) => ({
            bookingNumber: b.bookingNumber,
            operatorName: b.operatorName,
            baseFare: Number(b.baseFare),
            serviceTax: Number(b.serviceTax),
            convenienceFee: Number(b.convenienceFee),
            discountAmount: Number(b.discountAmount),
            totalFare: Number(b.totalFare),
            date: b.createdAt.toISOString().slice(0, 10),
        }));
    }
    /**
     * Bookings operational report
     */
    async getBookingReport(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const where = {};
        if (query.status) {
            where.status = query.status;
        }
        if (query.operatorName) {
            where.operatorName = { contains: query.operatorName, mode: 'insensitive' };
        }
        const dateFilter = (0, admin_utils_1.buildDateFilter)(query.startDate, query.endDate, 'createdAt');
        if (dateFilter) {
            Object.assign(where, dateFilter);
        }
        const bookings = await prisma.booking.findMany({
            where,
            select: {
                bookingNumber: true,
                providerPnrNo: true,
                fromCityName: true,
                toCityName: true,
                journeyDate: true,
                operatorName: true,
                busType: true,
                totalFare: true,
                status: true,
                contactName: true,
                contactPhone: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5000,
        });
        return bookings.map((b) => ({
            bookingNumber: b.bookingNumber,
            pnrNumber: b.providerPnrNo || '',
            route: `${b.fromCityName} -> ${b.toCityName}`,
            journeyDate: b.journeyDate,
            operatorName: b.operatorName,
            busType: b.busType,
            totalFare: Number(b.totalFare),
            status: b.status,
            passengerName: b.contactName,
            passengerPhone: b.contactPhone,
            bookedAt: b.createdAt.toISOString(),
        }));
    }
    /**
     * User growth & status report
     */
    async getUserReport(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const where = {};
        if (query.status) {
            where.status = query.status;
        }
        const dateFilter = (0, admin_utils_1.buildDateFilter)(query.startDate, query.endDate, 'createdAt');
        if (dateFilter) {
            Object.assign(where, dateFilter);
        }
        const users = await prisma.user.findMany({
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
                _count: {
                    select: { bookings: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 5000,
        });
        return users.map((u) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`.trim(),
            email: u.email,
            phone: u.phone || '',
            role: u.role,
            status: u.status,
            totalBookings: u._count.bookings,
            registeredAt: u.createdAt.toISOString(),
        }));
    }
    /**
     * Cancellations & deductions report
     */
    async getCancellationReport(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const where = {};
        if (query.status) {
            where.status = query.status;
        }
        const dateFilter = (0, admin_utils_1.buildDateFilter)(query.startDate, query.endDate, 'createdAt');
        if (dateFilter) {
            Object.assign(where, dateFilter);
        }
        const cancellations = await prisma.cancellation.findMany({
            where,
            include: {
                booking: {
                    select: {
                        bookingNumber: true,
                        operatorName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 5000,
        });
        return cancellations.map((c) => ({
            id: c.id,
            bookingNumber: c.booking.bookingNumber,
            operatorName: c.booking.operatorName,
            seatNumbers: c.seatNos.join(', '),
            totalFare: Number(c.totalFare),
            cancellationCharge: Number(c.chargeAmt),
            refundAmount: Number(c.refundAmount),
            status: c.status,
            cancelledAt: c.createdAt.toISOString(),
        }));
    }
    /**
     * Payment transactions & reconciliation report
     */
    async getPaymentReport(query) {
        const prisma = (0, database_1.getPrismaClient)();
        const where = {};
        if (query.status) {
            where.status = query.status;
        }
        const dateFilter = (0, admin_utils_1.buildDateFilter)(query.startDate, query.endDate, 'createdAt');
        if (dateFilter) {
            Object.assign(where, dateFilter);
        }
        const payments = await prisma.payment.findMany({
            where,
            include: {
                booking: {
                    select: {
                        bookingNumber: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 5000,
        });
        return payments.map((p) => ({
            id: p.id,
            bookingNumber: p.booking.bookingNumber,
            merchantTxnId: p.merchantTxnId,
            gatewayOrderId: p.gatewayOrderId || '',
            gateway: p.gateway,
            amount: Number(p.amount),
            status: p.status,
            webhookVerified: p.webhookVerified ? 'YES' : 'NO',
            createdAt: p.createdAt.toISOString(),
        }));
    }
}
exports.ReportService = ReportService;
//# sourceMappingURL=report.service.js.map