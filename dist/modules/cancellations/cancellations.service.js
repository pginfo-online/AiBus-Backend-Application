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
const ledger_1 = require("../../infrastructure/ledger");
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
    async cancelSeats(bookingIdentifier, seatNos, reason, userId, refundToWallet) {
        const prisma = (0, database_1.getPrismaClient)();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);
        const booking = isUuid
            ? await prisma.booking.findUnique({
                where: { id: bookingIdentifier },
                include: { seats: true, payments: true, commissionSnapshot: true, ticket: true },
            })
            : await prisma.booking.findUnique({
                where: { bookingNumber: bookingIdentifier },
                include: { seats: true, payments: true, commissionSnapshot: true, ticket: true },
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
            const refundAmount = Number(cancelRes.RefundAmount ?? 0);
            let commissionReversal = 0;
            let netRefundToAgent = refundAmount;
            if (booking.agentId && booking.commissionSnapshot) {
                const totalBookingFare = Number(booking.totalFare);
                const origCommission = Number(booking.commissionSnapshot.commissionAmt);
                if (totalBookingFare > 0) {
                    commissionReversal = Math.round(((refundAmount / totalBookingFare) * origCommission) * 100) / 100;
                }
                netRefundToAgent = Math.max(0, refundAmount - commissionReversal);
            }
            const isAgentBooking = Boolean(booking.agentId);
            const targetUserId = userId ?? booking.userId ?? null;
            // Customer wallet credit: when not an agent booking, user exists, and refundToWallet is requested (or true)
            const creditToCustomerWallet = !isAgentBooking && Boolean(targetUserId) && refundToWallet === true;
            // 3. Atomically update DB records & financials
            const cancellationResult = await prisma.$transaction(async (tx) => {
                // Record cancellation
                const cancellation = await tx.cancellation.create({
                    data: {
                        bookingId: booking.id,
                        userId: targetUserId,
                        status: client_1.CancellationStatus.COMPLETED,
                        seatNos,
                        providerNewHoldId: cancelRes.NewHoldId ? String(cancelRes.NewHoldId) : null,
                        providerNewTicketNo: cancelRes.NewTicketNo ? String(cancelRes.NewTicketNo) : null,
                        providerNewPnrNo: cancelRes.NewPNRNo ? String(cancelRes.NewPNRNo) : null,
                        chargePct: Number(cancelRes.ChargePct ?? 0),
                        chargeAmt: Number(cancelRes.ChargeAmt ?? cancelRes.CancellationCharge ?? 0),
                        refundAmount,
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
                // Update Ticket status to CANCELLED if ticket exists
                if (booking.ticket) {
                    await tx.ticket.update({
                        where: { id: booking.ticket.id },
                        data: { status: client_1.TicketStatus.CANCELLED },
                    });
                }
                // Credit to customer wallet if requested
                let customerNewWalletBalance = null;
                if (creditToCustomerWallet && refundAmount > 0 && targetUserId) {
                    const updatedUser = await tx.user.update({
                        where: { id: targetUserId },
                        data: {
                            walletBalance: { increment: refundAmount },
                        },
                        select: { walletBalance: true },
                    });
                    customerNewWalletBalance = Number(updatedUser.walletBalance);
                    await tx.walletTransaction.create({
                        data: {
                            userId: targetUserId,
                            type: client_1.WalletTransactionType.REFUND,
                            amount: refundAmount,
                            balanceAfter: updatedUser.walletBalance,
                            referenceType: 'BOOKING_CANCELLATION',
                            referenceId: booking.bookingNumber,
                            description: `Refund for cancellation of booking #${booking.bookingNumber}`,
                        },
                    });
                }
                const isWalletDestination = isAgentBooking || creditToCustomerWallet;
                // Create Refund record
                const payment = booking.payments.find((p) => p.status === 'SUCCESS');
                const refund = await tx.refund.create({
                    data: {
                        bookingId: booking.id,
                        paymentId: payment?.id ?? null,
                        cancellationId: cancellation.id,
                        userId: targetUserId,
                        amount: refundAmount,
                        status: isWalletDestination ? client_1.RefundStatus.COMPLETED : client_1.RefundStatus.PENDING,
                        destination: isWalletDestination ? client_1.RefundDestination.WALLET : client_1.RefundDestination.ORIGINAL_PAYMENT_METHOD,
                        reason: reason || 'Seat cancellation processed',
                        completedAt: isWalletDestination ? new Date() : null,
                    },
                });
                // If agent booking: credit agent wallet and post balanced double-entry ledger reversals
                if (booking.agentId) {
                    await tx.agentWallet.update({
                        where: { agentId: booking.agentId },
                        data: {
                            cashBalance: { increment: netRefundToAgent },
                            totalRefunds: { increment: refundAmount },
                            version: { increment: 1 },
                        },
                    });
                    const idempotencyPrefix = `CANCEL-${cancellation.id}-${Date.now()}`;
                    const ledgerLines = (0, ledger_1.buildRefundLines)({
                        bookingId: booking.id,
                        cancellationId: cancellation.id,
                        agentId: booking.agentId,
                        refundAmount,
                        commissionReversal,
                        idempotencyPrefix,
                    });
                    const ledgerData = (0, ledger_1.buildLedgerPostingData)({
                        agentId: booking.agentId,
                        bookingId: booking.id,
                        cancellationId: cancellation.id,
                        referenceId: booking.bookingNumber,
                        createdBy: userId || 'SYSTEM',
                        lines: ledgerLines,
                    });
                    await tx.ledgerEntry.createMany({ data: ledgerData, skipDuplicates: true });
                    if (booking.commissionSnapshot && commissionReversal > 0) {
                        await tx.commissionSnapshot.update({
                            where: { id: booking.commissionSnapshot.id },
                            data: {
                                reversedAt: new Date(),
                                reversalAmt: commissionReversal,
                            },
                        });
                    }
                }
                return {
                    cancellation,
                    refund,
                    providerResponse: cancelRes,
                    commissionReversal,
                    netRefundToAgent: isAgentBooking ? netRefundToAgent : undefined,
                    walletCredited: isWalletDestination,
                    newWalletBalance: customerNewWalletBalance,
                };
            });
            // 4. Enqueue gateway refund processing job only for customer credit-card/UPI payments if not credited to wallet
            if (!isAgentBooking && !creditToCustomerWallet && refundAmount > 0) {
                try {
                    await (0, queues_1.addJob)(constants_1.QueueName.REFUND_PROCESSING, 'process-refund', {
                        refundId: cancellationResult.refund.id,
                        bookingId: booking.id,
                        amount: refundAmount,
                    });
                }
                catch (queueErr) {
                    this.cancelLogger.warn({ queueErr }, 'Failed to queue refund processing job');
                }
            }
            this.cancelLogger.info({ bookingId: booking.id, refundAmount, isAgentBooking, creditToCustomerWallet }, 'Cancellation completed and financials settled');
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