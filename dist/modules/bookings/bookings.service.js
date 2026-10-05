"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const database_1 = require("../../infrastructure/database");
const gdsAdapter_1 = require("../../providers/gds/gdsAdapter");
const queues_1 = require("../../infrastructure/queues");
const constants_1 = require("../../shared/constants");
const errors_1 = require("../../shared/errors");
const logger_1 = require("../../infrastructure/logger");
const client_1 = require("@prisma/client");
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
    async createBooking(input, userId) {
        const prisma = (0, database_1.getPrismaClient)();
        // 1. Verify hold exists, is ACTIVE, and not expired
        const hold = await prisma.seatHold.findUnique({
            where: { id: input.holdId },
        });
        if (!hold) {
            throw new errors_1.NotFoundError('Hold record not found');
        }
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
        // 2. Generate unique booking number
        const bookingNumber = this.generateBookingNumber();
        // 3. Persist Booking, Seats, Passengers in atomic transaction
        const booking = await prisma.$transaction(async (tx) => {
            const createdBooking = await tx.booking.create({
                data: {
                    userId: userId ?? null,
                    bookingNumber,
                    status: client_1.BookingStatus.HELD,
                    providerName: 'GDS',
                    providerHoldId: hold.providerHoldId,
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
            // Link hold to booking
            await tx.seatHold.update({
                where: { id: hold.id },
                data: { bookingId: createdBooking.id },
            });
            return createdBooking;
        });
        this.bookingLogger.info({ bookingId: booking.id, bookingNumber: booking.bookingNumber }, 'Booking initiated successfully');
        return booking;
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
            if (bookRes.Status !== 1) {
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
                // Generate Ticket record
                const ticketNumber = `TKT-${booking.bookingNumber}`;
                await tx.ticket.create({
                    data: {
                        bookingId: updated.id,
                        ticketNumber,
                        pnrNumber: bookRes.PNRNo || 'N/A',
                        status: client_1.TicketStatus.ISSUED,
                        bookingSnapshot: updated,
                    },
                });
                return updated;
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
        const booking = await prisma.booking.findUnique({
            where: { id },
            include: {
                seats: true,
                passengers: true,
                payments: true,
                ticket: true,
                cancellations: true,
            },
        });
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        return booking;
    }
    async getUserBookings(userId) {
        const prisma = (0, database_1.getPrismaClient)();
        return prisma.booking.findMany({
            where: { userId },
            include: {
                seats: true,
                passengers: true,
                ticket: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    generateBookingNumber() {
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `AIB-${datePart}-${randomPart}`;
    }
}
exports.BookingsService = BookingsService;
//# sourceMappingURL=bookings.service.js.map