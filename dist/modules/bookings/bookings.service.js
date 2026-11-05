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
const holds_service_1 = require("../holds/holds.service");
const database_1 = require("../../infrastructure/database");
const gdsAdapter_1 = require("../../providers/gds/gdsAdapter");
const queues_1 = require("../../infrastructure/queues");
const constants_1 = require("../../shared/constants");
const errors_1 = require("../../shared/errors");
const logger_1 = require("../../infrastructure/logger");
const client_1 = require("@prisma/client");
const commission_1 = require("../../infrastructure/commission");
const coupons_service_1 = require("../coupons/coupons.service");
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
        if (!input.holdId)
            throw new errors_1.ValidationError('An active seat hold is required');
        if (input.useWallet)
            throw new errors_1.ValidationError('Customer wallet spending is currently unavailable');
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.holdId);
        const hold = isUuid
            ? await prisma.seatHold.findUnique({ where: { id: input.holdId } })
            : await prisma.seatHold.findUnique({
                where: { providerName_providerHoldId: { providerName: 'GDS', providerHoldId: input.holdId } },
            });
        if (!hold || hold.userId !== (userId ?? null) || (!hold.userId && !isUuid)) {
            throw new errors_1.NotFoundError('Seat hold not found');
        }
        if (hold.status !== client_1.HoldStatus.ACTIVE || hold.expiresAt <= new Date()) {
            throw new errors_1.ValidationError('Seat hold expired or unavailable');
        }
        if (hold.fromCityId !== input.fromCityId || hold.toCityId !== input.toCityId
            || hold.busId !== input.busId || hold.journeyDate !== input.journeyDate) {
            throw new errors_1.ValidationError('Booking does not match the held trip');
        }
        if (hold.bookingId) {
            const existing = await prisma.booking.findUnique({
                where: { id: hold.bookingId }, include: { seats: true, passengers: true },
            });
            if (existing && (existing.status === client_1.BookingStatus.HELD || existing.status === client_1.BookingStatus.PAYMENT_PENDING)) {
                return existing;
            }
            throw new errors_1.ConflictError('Seat hold is already linked to a booking');
        }
        const passengers = hold.seats;
        if (!Array.isArray(passengers) || !passengers.length
            || passengers.some((p) => !Number.isFinite(p.fare) || !Number.isFinite(p.baseFare))) {
            throw new errors_1.ValidationError('Seat pricing is unavailable. Please hold your seats again.');
        }
        const totalFare = passengers.reduce((sum, p) => sum + Math.round(p.fare * 100), 0) / 100;
        const baseFare = passengers.reduce((sum, p) => sum + Math.round(p.baseFare * 100), 0) / 100;
        const serviceTax = Math.round((totalFare - baseFare) * 100) / 100;
        const providerHoldId = hold.providerHoldId;
        let operatorName = input.operatorName;
        if (agentId || input.couponCode) {
            const buses = await this.gdsAdapter.searchBus({
                busId: hold.busId, fromCityId: hold.fromCityId, toCityId: hold.toCityId, journeyDate: hold.journeyDate,
            });
            const bus = buses.find((bus) => bus.RouteBusId === hold.busId);
            if (!bus)
                throw new errors_1.ValidationError('Operator could not be verified for the selected trip');
            operatorName = bus.CompanyName;
        }
        // Resolve B2B commission if agent booking
        let commissionResult = null;
        if (agentId) {
            commissionResult = await (0, commission_1.resolveCommission)({
                agentId,
                grossFare: totalFare,
                baseFare: baseFare,
                fromCityId: input.fromCityId,
                toCityId: input.toCityId,
                operatorName,
                journeyDate: input.journeyDate,
            });
        }
        // 2. Authoritative Coupon Validation & Discount Calculation
        let couponDiscount = 0;
        let appliedCoupon = null;
        let effectivePayableFare = totalFare;
        if (agentId && input.couponCode)
            throw new errors_1.ValidationError('Offers apply to retail checkout');
        if (input.couponCode) {
            const couponsService = coupons_service_1.CouponsService.getInstance();
            const validation = await couponsService.validateCoupon({
                code: input.couponCode,
                totalFare: totalFare,
                operatorName,
                fromCityId: input.fromCityId,
                toCityId: input.toCityId,
                busId: input.busId,
                userId: userId ?? undefined,
            });
            couponDiscount = validation.discountAmount;
            effectivePayableFare = validation.finalPayableAmount;
            appliedCoupon = validation.coupon;
        }
        if (!agentId && effectivePayableFare < 1) {
            throw new errors_1.ValidationError('Razorpay checkout requires a payable fare of at least INR 1');
        }
        // 4. Generate unique booking number
        const bookingNumber = this.generateBookingNumber();
        // 5. Persist Booking, Seats, Passengers, and CommissionSnapshot in atomic transaction
        const booking = await prisma.$transaction(async (tx) => {
            const dropoffSnapshotWithCoupon = {
                ...(input.dropoffSnapshot || {}),
                couponMetadata: appliedCoupon
                    ? {
                        id: appliedCoupon.id,
                        code: appliedCoupon.code,
                        discount: couponDiscount,
                    }
                    : null,
            };
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
                    operatorName,
                    busType: input.busType,
                    totalFare: effectivePayableFare,
                    baseFare: baseFare,
                    serviceTax: serviceTax,
                    discountAmount: couponDiscount,
                    contactName: input.contactName,
                    contactEmail: input.contactEmail,
                    contactPhone: input.contactPhone,
                    cancellationPolicy: input.cancellationPolicy ?? null,
                    pickupSnapshot: input.pickupSnapshot ?? null,
                    dropoffSnapshot: dropoffSnapshotWithCoupon,
                    seats: {
                        create: passengers.map((p) => ({
                            seatNo: p.seatNo,
                            seatTypeId: p.seatTypeId,
                            fareTotal: p.fare,
                            fareBase: p.baseFare,
                            fareTax: p.serviceTax,
                        })),
                    },
                    passengers: {
                        create: passengers.map((p) => ({
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
                        grossFare: totalFare,
                        baseFareForCommission: baseFare,
                        commissionRate: commissionResult.commissionRate,
                        commissionAmt: commissionResult.commissionAmt,
                        netFare: commissionResult.netFare,
                    },
                });
            }
            const linked = await tx.seatHold.updateMany({
                where: { id: hold.id, bookingId: null, status: client_1.HoldStatus.ACTIVE, expiresAt: { gt: new Date() } },
                data: { bookingId: createdBooking.id },
            });
            if (!linked.count)
                throw new errors_1.ConflictError('Seat hold expired or was already used');
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
        if (booking.agentId)
            return { booking, paymentIntent: null };
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
            where: { id: bookingId, version: booking.version, status: client_1.BookingStatus.PAYMENT_SUCCESS },
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
            // A failed call or local commit can leave a valid ticket at the operator.
            const unknown = await prisma.booking.updateMany({
                where: { id: bookingId, status: client_1.BookingStatus.BOOKING_REQUESTED },
                data: { status: client_1.BookingStatus.BOOKING_UNKNOWN, version: { increment: 1 } },
            });
            if (unknown.count) {
                await (0, queues_1.addJob)(constants_1.QueueName.BOOKING_RECONCILIATION, 'reconcile-unknown-booking', { bookingId, providerHoldId: booking.providerHoldId }, { delay: 10000, attempts: 5, backoff: { type: 'exponential', delay: 5000 } });
            }
            throw err;
        }
    }
    async getBooking(id, userId) {
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
        if (!booking || (booking.userId ? booking.userId !== userId : !isUuid)) {
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
    async checkBookingStatus(input, userId) {
        const bookingId = input.bookingId || input.bookingNumber;
        const holdId = input.holdId || input.HoldId;
        const booking = bookingId ? await this.getBooking(bookingId, userId) : null;
        if (booking?.status === client_1.BookingStatus.CONFIRMED && booking.providerTicketNo && booking.providerPnrNo) {
            return { Status: 1, Message: 'Booking is confirmed', TicketNo: booking.providerTicketNo, PNRNo: booking.providerPnrNo };
        }
        if (booking && [client_1.BookingStatus.CANCELLED, client_1.BookingStatus.REFUNDED].some((status) => status === booking.status)) {
            return { Status: -1, Message: 'Booking is cancelled or refunded' };
        }
        if (booking?.providerHoldId)
            return this.gdsAdapter.checkBookingStatus(booking.providerHoldId);
        if (!holdId)
            throw new errors_1.ValidationError('HoldId or BookingId is required');
        return holds_service_1.HoldsService.getInstance().checkHoldStatus(holdId, userId);
    }
    generateBookingNumber() {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `AIB-${datePart}-${randomPart}`;
    }
}
exports.BookingsService = BookingsService;
//# sourceMappingURL=bookings.service.js.map