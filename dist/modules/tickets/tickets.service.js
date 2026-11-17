"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsService = void 0;
const database_1 = require("../../infrastructure/database");
const errors_1 = require("../../shared/errors");
const gdsAdapter_1 = require("../../providers/gds/gdsAdapter");
const ticketPdfGenerator_1 = require("../../infrastructure/pdf/ticketPdfGenerator");
class TicketsService {
    static instance;
    static getInstance() {
        return (this.instance ??= new TicketsService());
    }
    async getGdsBookingDetails(pnr, ticketNo, userId) {
        const booking = await (0, database_1.getPrismaClient)().booking.findFirst({
            where: { userId, providerPnrNo: pnr, providerTicketNo: ticketNo },
            select: { id: true },
        });
        if (!booking)
            throw new errors_1.NotFoundError("Booking");
        return gdsAdapter_1.GdsAdapter.getInstance().getBookingDetails(pnr, ticketNo);
    }
    async refreshProviderDetails(bookingId) {
        const db = (0, database_1.getPrismaClient)();
        const booking = await db.booking.findUniqueOrThrow({
            where: { id: bookingId },
        });
        if (!booking.providerTicketNo ||
            !booking.providerPnrNo ||
            booking.status !== "CONFIRMED")
            return;
        const details = await gdsAdapter_1.GdsAdapter.getInstance().getBookingDetails(booking.providerPnrNo, booking.providerTicketNo);
        if (details.TicketNo &&
            String(details.TicketNo) !== booking.providerTicketNo)
            return;
        const pickup = booking.pickupSnapshot || {};
        const dropoff = booking.dropoffSnapshot || {};
        await db.booking.updateMany({
            where: { id: bookingId, version: booking.version, status: "CONFIRMED" },
            data: {
                ticketEnrichedAt: new Date(),
                operatorName: details.CompanyName || booking.operatorName,
                busType: details.BusTypeName || booking.busType,
                fromCityName: details.FromCityName || booking.fromCityName,
                toCityName: details.ToCityName || booking.toCityName,
                pickupLocation: details.PickupInfo?.PickupName || booking.pickupLocation,
                pickupSnapshot: {
                    ...pickup,
                    address: details.PickupInfo?.Address ?? pickup.address ?? null,
                    landmark: details.PickupInfo?.Landmark ?? pickup.landmark ?? null,
                    contact: details.PickupInfo?.Phone ?? pickup.contact ?? null,
                    departureDateTime: details.DepartureDateTime ?? null,
                },
                dropoffSnapshot: {
                    ...dropoff,
                    arrivalDateTime: details.ArrivalDateTime ?? null,
                },
            },
        });
    }
    async getTicketByBookingId(identifier, forceRefresh = false, userId) {
        const db = (0, database_1.getPrismaClient)();
        const where = /^[0-9a-f-]{36}$/i.test(identifier)
            ? { id: identifier }
            : { bookingNumber: identifier };
        const booking = await db.booking.findFirst({
            where: { ...where, ...(userId ? { userId } : {}) },
            include: {
                seats: true,
                passengers: true,
                ticket: {
                    select: {
                        id: true,
                        ticketNumber: true,
                        pnrNumber: true,
                        status: true,
                        pdfUrl: true,
                        generatedAt: true,
                    },
                },
                payments: {
                    select: {
                        id: true,
                        status: true,
                        amount: true,
                        gateway: true,
                        merchantTxnId: true,
                    },
                },
                cancellations: {
                    select: {
                        id: true,
                        status: true,
                        seatNos: true,
                        refundAmount: true,
                        chargeAmt: true,
                        createdAt: true,
                        lastError: true,
                    },
                },
                refunds: {
                    select: {
                        id: true,
                        amount: true,
                        status: true,
                        destination: true,
                        completedAt: true,
                    },
                },
            },
        });
        if (!booking)
            throw new errors_1.NotFoundError("Booking");
        // Read paths never issue tickets or manufacture operator identifiers.
        const issued = [
            "CONFIRMED",
            "CANCELLATION_REQUESTED",
            "CANCELLED",
            "REFUNDED",
        ].includes(booking.status);
        return {
            id: booking.ticket?.id || booking.id,
            bookingId: booking.id,
            ticketNumber: issued
                ? booking.providerTicketNo || booking.ticket?.ticketNumber || null
                : null,
            pnrNumber: issued
                ? booking.providerPnrNo || booking.ticket?.pnrNumber || null
                : null,
            status: booking.status,
            pdfUrl: booking.ticket?.pdfUrl || null,
            generatedAt: booking.ticket?.generatedAt || booking.confirmedAt || booking.createdAt,
            booking,
        };
    }
    async getTicketByTicketNumber(ticketNumber, userId) {
        const booking = await (0, database_1.getPrismaClient)().booking.findFirst({
            where: {
                ...(userId ? { userId } : {}),
                OR: [
                    { providerTicketNo: ticketNumber },
                    { providerPnrNo: ticketNumber },
                    { bookingNumber: ticketNumber },
                    { ticket: { ticketNumber } },
                ],
            },
            select: { id: true },
        });
        if (!booking)
            throw new errors_1.NotFoundError("Ticket");
        return this.getTicketByBookingId(booking.id, false, userId);
    }
    async generateTicketPdfBuffer(identifier, userId) {
        const details = await this.getTicketByBookingId(identifier, false, userId);
        if (!details.ticketNumber || !details.pnrNumber)
            throw new errors_1.NotFoundError("Confirmed operator ticket");
        const booking = details.booking;
        const pdfData = {
            ...booking,
            pickupLocation: booking.pickupLocation,
            dropoffLocation: booking.dropoffLocation,
            ticketNumber: details.ticketNumber,
            pnrNumber: details.pnrNumber,
            totalFare: Number(booking.totalFare),
            passengers: booking.passengers.map((p) => ({
                name: p.name,
                age: p.age,
                gender: p.gender,
                seatNo: p.seatNo,
                cancelled: Boolean(booking.seats.find((s) => s.seatNo === p.seatNo)?.cancelledAt),
            })),
        };
        const buffer = await (0, ticketPdfGenerator_1.generateTicketPdf)(pdfData);
        return {
            buffer,
            fileName: `AiBus-Ticket-${details.ticketNumber.replace(/[^a-zA-Z0-9-]/g, "")}.pdf`,
        };
    }
}
exports.TicketsService = TicketsService;
//# sourceMappingURL=tickets.service.js.map