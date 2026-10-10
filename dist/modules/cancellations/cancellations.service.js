"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellationsService = void 0;
const database_1 = require("../../infrastructure/database");
const gdsAdapter_1 = require("../../providers/gds/gdsAdapter");
const queues_1 = require("../../infrastructure/queues");
const constants_1 = require("../../shared/constants");
const errors_1 = require("../../shared/errors");
const logger_1 = require("../../infrastructure/logger");
const client_1 = require("@prisma/client");
class CancellationsService {
    static instance;
    gdsAdapter;
    cancelLogger = logger_1.logger.child({ module: 'cancellations-service' });
    constructor() {
        this.gdsAdapter = gdsAdapter_1.GdsAdapter.getInstance();
    }
    static getInstance() {
        if (!CancellationsService.instance) {
            CancellationsService.instance = new CancellationsService();
        }
        return CancellationsService.instance;
    }
    async checkCancellability(bookingIdentifier, seatNos) {
        const prisma = (0, database_1.getPrismaClient)();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);
        const booking = isUuid
            ? await prisma.booking.findUnique({
                where: { id: bookingIdentifier },
                include: { seats: true },
            })
            : await prisma.booking.findUnique({
                where: { bookingNumber: bookingIdentifier },
                include: { seats: true },
            });
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        if (booking.status !== client_1.BookingStatus.CONFIRMED) {
            throw new errors_1.ValidationError(`Cannot check cancellation: Booking status is ${booking.status}`);
        }
        if (!booking.providerTicketNo) {
            throw new errors_1.ValidationError('Booking does not have an active ticket number');
        }
        const seatsToCancel = seatNos && seatNos.length > 0 ? seatNos.join(',') : booking.seats.map((s) => s.seatNo).join(',');
        const cancellableInfo = await this.gdsAdapter.isCancellable(booking.providerTicketNo, seatsToCancel, booking.providerPnrNo || undefined);
        return {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            ticketNo: booking.providerTicketNo,
            pnrNo: booking.providerPnrNo,
            seatNos: seatsToCancel,
            ...cancellableInfo,
        };
    }
    async checkCancellabilityDirect(params) {
        return this.gdsAdapter.isCancellable(params.ticketNo, params.seatNos, params.pnrNo);
    }
    async cancelSeatsDirect(params) {
        return this.gdsAdapter.cancelSeats({
            TicketNo: params.TicketNo,
            SeatNos: params.SeatNos,
            PNR: params.PNR,
        });
    }
    async cancelSeats(bookingIdentifier, seatNos, reason, userId) {
        const prisma = (0, database_1.getPrismaClient)();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);
        const booking = isUuid
            ? await prisma.booking.findUnique({
                where: { id: bookingIdentifier },
                include: { seats: true, payments: true },
            })
            : await prisma.booking.findUnique({
                where: { bookingNumber: bookingIdentifier },
                include: { seats: true, payments: true },
            });
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        if (booking.status !== client_1.BookingStatus.CONFIRMED) {
            throw new errors_1.ValidationError(`Cannot cancel booking in status ${booking.status}`);
        }
        if (!booking.providerTicketNo) {
            throw new errors_1.ValidationError('No active ticket number found for this booking');
        }
        const seatString = seatNos.join(',');
        // 1. Transition booking to CANCELLATION_REQUESTED
        await prisma.booking.update({
            where: { id: booking.id },
            data: { status: client_1.BookingStatus.CANCELLATION_REQUESTED },
        });
        try {
            // 2. Call upstream GDS provider CancelSeats
            const cancelRes = await this.gdsAdapter.cancelSeats({
                TicketNo: booking.providerTicketNo,
                PNR: booking.providerPnrNo || undefined,
                SeatNos: seatString,
            });
            // Status 1 = success; any other value (0, -1, -2, etc.) = failure
            if (cancelRes.Status !== 1) {
                throw new errors_1.ProviderError('GDS', cancelRes.Message || 'Failed to cancel seats with provider');
            }
            // 3. Atomically update DB records
            const cancellationResult = await prisma.$transaction(async (tx) => {
                // Record cancellation
                const cancellation = await tx.cancellation.create({
                    data: {
                        bookingId: booking.id,
                        userId: userId ?? booking.userId ?? null,
                        status: client_1.CancellationStatus.COMPLETED,
                        seatNos,
                        providerNewHoldId: cancelRes.NewHoldId ? String(cancelRes.NewHoldId) : null,
                        providerNewTicketNo: cancelRes.NewTicketNo ? String(cancelRes.NewTicketNo) : null,
                        providerNewPnrNo: cancelRes.NewPNRNo ? String(cancelRes.NewPNRNo) : null,
                        chargePct: Number(cancelRes.ChargePct ?? 0),
                        chargeAmt: Number(cancelRes.ChargeAmt ?? cancelRes.CancellationCharge ?? 0),
                        refundAmount: Number(cancelRes.RefundAmount ?? 0),
                        totalFare: Number(cancelRes.TotalFare || booking.totalFare),
                        reason,
                    },
                });
                // Update booking status
                await tx.booking.update({
                    where: { id: booking.id },
                    data: {
                        status: client_1.BookingStatus.CANCELLED,
                        cancelledAt: new Date(),
                    },
                });
                // Create Refund record
                const payment = booking.payments.find((p) => p.status === 'SUCCESS');
                const refund = await tx.refund.create({
                    data: {
                        bookingId: booking.id,
                        paymentId: payment?.id ?? null,
                        cancellationId: cancellation.id,
                        userId: userId ?? booking.userId ?? null,
                        amount: Number(cancelRes.RefundAmount ?? 0),
                        status: client_1.RefundStatus.PENDING,
                        destination: client_1.RefundDestination.ORIGINAL_PAYMENT_METHOD,
                        reason: reason || 'Customer requested seat cancellation',
                    },
                });
                return { cancellation, refund, providerResponse: cancelRes };
            });
            // 4. Enqueue refund processing job
            try {
                await (0, queues_1.addJob)(constants_1.QueueName.REFUND_PROCESSING, 'process-refund', {
                    refundId: cancellationResult.refund.id,
                    bookingId: booking.id,
                    amount: Number(cancelRes.RefundAmount ?? 0),
                });
            }
            catch (queueErr) {
                this.cancelLogger.warn({ queueErr }, 'Failed to queue refund processing job');
            }
            this.cancelLogger.info({ bookingId: booking.id, refundAmount: cancelRes.RefundAmount }, 'Cancellation successful and refund queued');
            return cancellationResult;
        }
        catch (err) {
            // Revert booking to CONFIRMED on provider cancellation rejection
            await prisma.booking.update({
                where: { id: booking.id },
                data: { status: client_1.BookingStatus.CONFIRMED },
            });
            throw err;
        }
    }
}
exports.CancellationsService = CancellationsService;
//# sourceMappingURL=cancellations.service.js.map