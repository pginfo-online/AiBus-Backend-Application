"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const database_1 = require("../../infrastructure/database");
const gdsAdapter_1 = require("../../providers/gds/gdsAdapter");
const queues_1 = require("../../infrastructure/queues");
const constants_1 = require("../../shared/constants");
const errors_1 = require("../../shared/errors");
const logger_1 = require("../../infrastructure/logger");
const client_1 = require("@prisma/client");
const commission_1 = require("../../infrastructure/commission");
class BookingsService {
    static instance;
    gdsAdapter;
    bookingLogger = logger_1.logger.child({ module: 'bookings-service' });
    constructor() {
        this.gdsAdapter = gdsAdapter_1.GdsAdapter.getInstance();
    }
    static getInstance() {
        if (!BookingsService.instance) {
            BookingsService.instance = new BookingsService();
        }
        return BookingsService.instance;
    }
    async createBooking(input, userId, explicitAgentId) {
        const prisma = (0, database_1.getPrismaClient)();
        // Determine agent context
        let agentId = explicitAgentId || null;
        if (!agentId && userId && prisma.agentStaff) {
            const staff = await prisma.agentStaff.findFirst({
                where: { userId, isActive: true },
                include: { agent: true },
            });
            if (staff?.agent) {
                if (staff.agent.status !== client_1.AgentStatus.APPROVED) {
                    throw new errors_1.AuthorizationError(`Agent account is not approved to create bookings. Current status: ${staff.agent.status}`);
                }
                agentId = staff.agent.id;
            }
        }
        // Resolve B2B commission if agent booking
        let commissionResult = null;
        if (agentId) {
            commissionResult = await (0, commission_1.resolveCommission)({
                agentId,
                grossFare: Number(input.totalFare),
                baseFare: Number(input.baseFare),
                fromCityId: input.fromCityId,
                toCityId: input.toCityId,
                operatorName: input.operatorName,
                journeyDate: input.journeyDate,
            });
        }
        // 1. Verify hold exists if a valid UUID holdId was provided
        let providerHoldId = `HOLD-GDS-${Date.now()}`;
        let holdRecordId = null;
        if (input.holdId) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.holdId);
            const hold = isUuid
                ? await prisma.seatHold.findUnique({ where: { id: input.holdId } })
                : await prisma.seatHold.findFirst({
                    where: { providerHoldId: String(input.holdId) },
                    orderBy: { createdAt: 'desc' },
                });
            if (hold) {
                if (hold.status !== client_1.HoldStatus.ACTIVE) {
                    throw new errors_1.ValidationError(`Cannot create booking: Hold status is ${hold.status}`);
                }
                if (new Date() > hold.expiresAt) {
                    await prisma.seatHold.update({
                        where: { id: hold.id },
                        data: { status: client_1.HoldStatus.EXPIRED },
                    });
                    throw new errors_1.ValidationError('Seat hold has expired. Please select seats again.');
                }
                if (hold.bookingId) {
                    const existingBooking = await prisma.booking.findUnique({
                        where: { id: hold.bookingId },
                        include: { seats: true, passengers: true },
                    });
                    if (existingBooking &&
                        (existingBooking.status === client_1.BookingStatus.HELD ||
                            existingBooking.status === client_1.BookingStatus.PAYMENT_PENDING)) {
                        this.bookingLogger.info({ bookingId: existingBooking.id, holdId: hold.id }, 'Returning existing booking for active hold (idempotent)');
                        return existingBooking;
                    }
                }
                providerHoldId = hold.providerHoldId;
                holdRecordId = hold.id;
            }
            else if (!isUuid) {
                // Direct providerHoldId provided
                providerHoldId = String(input.holdId);
            }
        }
        if (providerHoldId && !providerHoldId.startsWith('HOLD-GDS-') && typeof prisma.booking.findFirst === 'function') {
            const existingBookingWithHold = await prisma.booking.findFirst({
                where: {
                    providerHoldId,
                    status: { in: [client_1.BookingStatus.HELD, client_1.BookingStatus.PAYMENT_PENDING] },
                },
                include: { seats: true, passengers: true },
                orderBy: { createdAt: 'desc' },
            });
            if (existingBookingWithHold) {
                this.bookingLogger.info({ bookingId: existingBookingWithHold.id, providerHoldId }, 'Returning existing booking for provider hold (idempotent)');
                return existingBookingWithHold;
            }
        }
        // 2. Generate unique booking number
        const bookingNumber = this.generateBookingNumber();
        // 3. Persist Booking, Seats, Passengers, and CommissionSnapshot in atomic transaction
        const booking = await prisma.$transaction(async (tx) => {
            const createdBooking = await tx.booking.create({
                data: {
                    userId: userId ?? null,
                    agentId: agentId ?? null,
                    userType: agentId ? 'AGENT' : 'CUSTOMER',
                    bookingNumber,
                    status: client_1.BookingStatus.HELD,
                    providerName: 'GDS',
                    providerHoldId,
                    fromCityId: input.fromCityId,
                    toCityId: input.toCityId,
                    fromCityName: input.fromCityName,
                    toCityName: input.toCityName,
                    journeyDate: input.journeyDate,
                    busId: input.busId,
                    tripId: input.tripId,
                    pickupCode: input.pickupCode,
                    pickupLocation: input.pickupLocation,
                    pickupTime: input.pickupTime,
                    dropoffCode: input.dropoffCode,
                    dropoffLocation: input.dropoffLocation,
                    dropoffTime: input.dropoffTime,
                    operatorName: input.operatorName,
                    busType: input.busType,
                    totalFare: input.totalFare,
                    baseFare: input.baseFare,
                    serviceTax: input.serviceTax,
                    contactName: input.contactName,
                    contactEmail: input.contactEmail,
                    contactPhone: input.contactPhone,
                    cancellationPolicy: input.cancellationPolicy ?? null,
                    pickupSnapshot: input.pickupSnapshot ?? null,
                    dropoffSnapshot: input.dropoffSnapshot ?? null,
                    seats: {
                        create: input.passengers.map((p) => ({
                            seatNo: p.seatNo,
                            seatTypeId: p.seatTypeId,
                            fareTotal: p.fare,
                            fareBase: input.baseFare / input.passengers.length,
                            fareTax: input.serviceTax / input.passengers.length,
                        })),
                    },
                    passengers: {
                        create: input.passengers.map((p) => ({
                            name: p.name,
                            age: p.age,
                            gender: p.gender,
                            seatNo: p.seatNo,
                            fare: p.fare,
                            seatTypeId: p.seatTypeId,
                            isAcSeat: p.isAcSeat,
                        })),
                    },
                },
                include: {
                    seats: true,
                    passengers: true,
                },
            });
            // Save immutable CommissionSnapshot for B2B booking
            if (agentId && commissionResult) {
                await tx.commissionSnapshot.create({
                    data: {
                        bookingId: createdBooking.id,
                        agentId,
                        ruleId: commissionResult.ruleId,
                        ruleSnapshot: commissionResult.ruleSnapshot ? commissionResult.ruleSnapshot : {},
                        grossFare: input.totalFare,
                        baseFareForCommission: input.baseFare,
                        commissionRate: commissionResult.commissionRate,
                        commissionAmt: commissionResult.commissionAmt,
                        netFare: commissionResult.netFare,
                    },
                });
            }
            // Link hold to booking if holdRecordId exists
            if (holdRecordId) {
                await tx.seatHold.update({
                    where: { id: holdRecordId },
                    data: { bookingId: createdBooking.id },
                });
            }
            return createdBooking;
        });
        this.bookingLogger.info({ bookingId: booking.id, bookingNumber: booking.bookingNumber }, 'Booking created in HELD status — awaiting payment verification before GDS BookSeats');
        // NOTE: GDS BookSeats (confirmBooking) must ONLY be called after payment verification.
        // The payment lifecycle is: HELD → PAYMENT_PENDING → PAYMENT_SUCCESS → CONFIRMED.
        // Never call confirmBooking() here — it is called by PaymentsService.verifyPayment() only.
        return booking;
    }
    /**
     * Unified Checkout Session Creation:
     * Consolidates Booking persistence + Gateway Intent generation in a single atomic pipeline.
     * Eliminates 3 separate mobile network hops and ensures instant checkout launch.
     */
    async createCheckoutSession(input, userId, explicitAgentId) {
        // 1. Create or retrieve existing booking for active hold
        const booking = await this.createBooking(input, userId, explicitAgentId);
        // 2. Generate payment intent via PaymentsService
        const { PaymentsService } = await Promise.resolve().then(() => __importStar(require('../payments/payments.service')));
        const paymentsService = PaymentsService.getInstance();
        const paymentIntent = await paymentsService.createPaymentIntent({
            bookingId: booking.id,
            gateway: input.gateway || 'RAZORPAY',
            paymentMode: input.paymentMode,
            redirectUrl: input.redirectUrl,
        }, userId);
        return {
            booking,
            paymentIntent,
        };
    }
    /**
     * Complete booking against upstream provider once payment is verified
     */
    async confirmBooking(bookingId) {
        const prisma = (0, database_1.getPrismaClient)();
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { seats: true, passengers: true },
        });
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        if (booking.status === client_1.BookingStatus.CONFIRMED) {
            return booking; // Already confirmed (idempotent)
        }
        if (!booking.providerHoldId) {
            throw new errors_1.ValidationError('Booking is missing provider hold ID');
        }
        // Transition to BOOKING_REQUESTED
        await prisma.booking.update({
            where: { id: bookingId, version: booking.version },
            data: {
                status: client_1.BookingStatus.BOOKING_REQUESTED,
                version: { increment: 1 },
            },
        });
        try {
            // Call GDS BookSeats
            const bookRes = await this.gdsAdapter.bookSeats(booking.providerHoldId, Number(booking.totalFare));
            if (bookRes.Status !== 1 || !bookRes.TicketNo) {
                throw new errors_1.ProviderError('GDS', bookRes.Message || 'Booking failed at provider');
            }
            // Confirmed at provider!
            const confirmedBooking = await prisma.$transaction(async (tx) => {
                const updated = await tx.booking.update({
                    where: { id: bookingId },
                    data: {
                        status: client_1.BookingStatus.CONFIRMED,
                        providerTicketNo: bookRes.TicketNo,
                        providerPnrNo: bookRes.PNRNo,
                        confirmedAt: new Date(),
                        version: { increment: 1 },
                    },
                    include: { seats: true, passengers: true },
                });
                // Mark Hold as CONVERTED
                if (booking.providerHoldId) {
                    await tx.seatHold.updateMany({
                        where: { providerHoldId: booking.providerHoldId },
                        data: { status: client_1.HoldStatus.CONVERTED },
                    });
                }
                // Generate Ticket record using actual 3rd party provider TicketNo (per Transactionapi.md)
                const ticketNumber = String(bookRes.TicketNo || booking.providerTicketNo || `TKT-${booking.bookingNumber}`);
                const createdTicket = await tx.ticket.create({
                    data: {
                        bookingId: updated.id,
                        ticketNumber,
                        pnrNumber: bookRes.PNRNo || 'N/A',
                        status: client_1.TicketStatus.ISSUED,
                        bookingSnapshot: updated,
                    },
                });
                return { ...updated, ticket: createdTicket };
            });
            // Queue confirmation notifications
            try {
                await (0, queues_1.addJob)(constants_1.QueueName.NOTIFICATION_EMAIL, 'booking-confirmation-email', {
                    bookingId: confirmedBooking.id,
                    recipient: confirmedBooking.contactEmail,
                    bookingNumber: confirmedBooking.bookingNumber,
                });
                await (0, queues_1.addJob)(constants_1.QueueName.NOTIFICATION_SMS, 'booking-confirmation-sms', {
                    bookingId: confirmedBooking.id,
                    recipient: confirmedBooking.contactPhone,
                    bookingNumber: confirmedBooking.bookingNumber,
                });
            }
            catch (queueErr) {
                this.bookingLogger.warn({ queueErr }, 'Failed to queue booking notifications');
            }
            this.bookingLogger.info({ bookingId: confirmedBooking.id, pnr: bookRes.PNRNo, ticketNo: bookRes.TicketNo }, 'Booking confirmed successfully');
            return confirmedBooking;
        }
        catch (err) {
            this.bookingLogger.error({ err: err.message, bookingId }, 'Error during upstream BookSeats call');
            // Distinguish network timeout from provider hard failure
            const isTimeout = err.code === 'ECONNABORTED' ||
                err.code === 'ETIMEDOUT' ||
                err.message?.includes('timeout') ||
                err.name === 'ProviderTimeoutError';
            if (isTimeout) {
                // Mark as BOOKING_UNKNOWN and queue reconciliation job!
                await prisma.booking.update({
                    where: { id: bookingId },
                    data: { status: client_1.BookingStatus.BOOKING_UNKNOWN, version: { increment: 1 } },
                });
                await (0, queues_1.addJob)(constants_1.QueueName.BOOKING_RECONCILIATION, 'reconcile-unknown-booking', { bookingId, providerHoldId: booking.providerHoldId }, { delay: 10000, attempts: 5, backoff: { type: 'exponential', delay: 5000 } });
                this.bookingLogger.warn({ bookingId }, 'Booking status UNKNOWN due to network timeout — queued for background reconciliation');
            }
            else {
                // Provider hard rejection: transition to BOOKING_FAILED and queue refund
                await prisma.booking.update({
                    where: { id: bookingId },
                    data: { status: client_1.BookingStatus.BOOKING_FAILED, version: { increment: 1 } },
                });
                await (0, queues_1.addJob)(constants_1.QueueName.REFUND_PROCESSING, 'auto-refund-failed-booking', {
                    bookingId,
                    reason: 'Booking failed with provider',
                    amount: Number(booking.totalFare),
                });
                this.bookingLogger.error({ bookingId }, 'Booking rejected by provider — marked BOOKING_FAILED and queued auto-refund');
            }
            throw err;
        }
    }
    async getBooking(id) {
        const prisma = (0, database_1.getPrismaClient)();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const booking = isUuid
            ? await prisma.booking.findUnique({
                where: { id },
                include: {
                    seats: true,
                    passengers: true,
                    payments: true,
                    ticket: true,
                    cancellations: true,
                    refunds: true,
                },
            })
            : await prisma.booking.findUnique({
                where: { bookingNumber: id },
                include: {
                    seats: true,
                    passengers: true,
                    payments: true,
                    ticket: true,
                    cancellations: true,
                    refunds: true,
                },
            });
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        return booking;
    }
    async getUserBookings(userId) {
        const prisma = (0, database_1.getPrismaClient)();
        const staff = prisma.agentStaff
            ? await prisma.agentStaff.findFirst({
                where: { userId, isActive: true },
                select: { agentId: true },
            })
            : null;
        const where = staff?.agentId
            ? { agentId: staff.agentId }
            : { userId };
        return prisma.booking.findMany({
            where,
            include: {
                seats: true,
                passengers: true,
                ticket: true,
                payments: true,
                cancellations: true,
                refunds: true,
                commissionSnapshot: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async checkBookingStatus(input) {
        const prisma = (0, database_1.getPrismaClient)();
        let targetHoldId = input.holdId || input.HoldId;
        let localBooking = null;
        if (!targetHoldId) {
            const searchKey = input.bookingId || input.bookingNumber;
            if (searchKey) {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchKey);
                localBooking = isUuid
                    ? await prisma.booking.findUnique({ where: { id: searchKey } })
                    : await prisma.booking.findUnique({ where: { bookingNumber: searchKey } });
                if (localBooking?.providerHoldId) {
                    targetHoldId = localBooking.providerHoldId;
                }
            }
        }
        if (!targetHoldId) {
            throw new errors_1.ValidationError('HoldId or BookingId is required to check booking status');
        }
        // Fast-path: If local booking is already CONFIRMED with ticket/provider info, return immediately
        if (localBooking && localBooking.status === client_1.BookingStatus.CONFIRMED && localBooking.providerTicketNo) {
            return {
                Status: 1,
                Message: 'Booking is confirmed',
                TicketNo: localBooking.providerTicketNo,
                PNRNo: localBooking.providerPnrNo || 'N/A',
                BookingId: localBooking.id,
                BookingNumber: localBooking.bookingNumber,
                booking: localBooking,
            };
        }
        // Check if targetHoldId is a local SeatHold UUID
        const isHoldUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetHoldId);
        if (isHoldUuid) {
            const holdRec = await prisma.seatHold.findUnique({ where: { id: targetHoldId } });
            if (holdRec?.providerHoldId) {
                targetHoldId = holdRec.providerHoldId;
            }
        }
        // Call Mantis GDS POST /ota/bookingstatusv2
        const statusRes = await this.gdsAdapter.checkBookingStatus(targetHoldId);
        // If booking was successful (Status 1) and we have local booking record not yet confirmed, auto-confirm
        if (statusRes.Status === 1 && statusRes.TicketNo) {
            if (!localBooking) {
                localBooking = await prisma.booking.findFirst({
                    where: { providerHoldId: targetHoldId },
                });
            }
            if (localBooking && localBooking.status !== client_1.BookingStatus.CONFIRMED) {
                // Atomically confirm booking AND create Ticket record
                await prisma.$transaction(async (tx) => {
                    await tx.booking.update({
                        where: { id: localBooking.id },
                        data: {
                            status: client_1.BookingStatus.CONFIRMED,
                            providerTicketNo: statusRes.TicketNo,
                            providerPnrNo: statusRes.PNRNo,
                            confirmedAt: new Date(),
                        },
                    });
                    // Ensure Ticket record exists (idempotent — only create if not already present)
                    const existingTicket = await tx.ticket.findUnique({ where: { bookingId: localBooking.id } });
                    const ticketNumber = String(statusRes.TicketNo || localBooking.providerTicketNo || `TKT-${localBooking.bookingNumber}`);
                    if (!existingTicket) {
                        await tx.ticket.create({
                            data: {
                                bookingId: localBooking.id,
                                ticketNumber,
                                pnrNumber: statusRes.PNRNo || 'N/A',
                                status: client_1.TicketStatus.ISSUED,
                                bookingSnapshot: localBooking,
                            },
                        });
                    }
                    else if (statusRes.TicketNo && existingTicket.ticketNumber.startsWith('TKT-')) {
                        await tx.ticket.update({
                            where: { id: existingTicket.id },
                            data: { ticketNumber: String(statusRes.TicketNo) },
                        });
                    }
                });
                this.bookingLogger.info({ bookingId: localBooking.id, ticketNo: statusRes.TicketNo, pnrNo: statusRes.PNRNo }, 'checkBookingStatus: booking auto-confirmed and ticket created');
            }
        }
        return {
            HoldId: statusRes.HoldId || targetHoldId,
            Status: statusRes.Status,
            TicketNo: statusRes.TicketNo,
            PNRNo: statusRes.PNRNo,
            Message: statusRes.Message,
            bookingId: localBooking?.id,
            bookingNumber: localBooking?.bookingNumber,
        };
    }
    generateBookingNumber() {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `AIB-${datePart}-${randomPart}`;
    }
}
exports.BookingsService = BookingsService;
//# sourceMappingURL=bookings.service.js.map