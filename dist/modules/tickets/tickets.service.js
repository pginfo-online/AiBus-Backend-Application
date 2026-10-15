"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsService = void 0;
const database_1 = require("../../infrastructure/database");
const errors_1 = require("../../shared/errors");
const gdsAdapter_1 = require("../../providers/gds/gdsAdapter");
const ticketPdfGenerator_1 = require("../../infrastructure/pdf/ticketPdfGenerator");
class TicketsService {
    static instance;
    gdsAdapter;
    constructor() {
        this.gdsAdapter = gdsAdapter_1.GdsAdapter.getInstance();
    }
    static getInstance() {
        if (!TicketsService.instance) {
            TicketsService.instance = new TicketsService();
        }
        return TicketsService.instance;
    }
    async getGdsBookingDetails(pnr, ticketNo) {
        return this.gdsAdapter.getBookingDetails(pnr, ticketNo);
    }
    async getTicketByBookingId(bookingIdentifier) {
        const prisma = (0, database_1.getPrismaClient)();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingIdentifier);
        const booking = isUuid
            ? await prisma.booking.findUnique({
                where: { id: bookingIdentifier },
                include: {
                    seats: true,
                    passengers: true,
                    ticket: true,
                    payments: true,
                    cancellations: true,
                },
            })
            : await prisma.booking.findUnique({
                where: { bookingNumber: bookingIdentifier },
                include: {
                    seats: true,
                    passengers: true,
                    ticket: true,
                    payments: true,
                    cancellations: true,
                },
            });
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        let gdsDetails = null;
        if (booking.providerPnrNo && booking.providerTicketNo) {
            try {
                gdsDetails = await this.gdsAdapter.getBookingDetails(booking.providerPnrNo, booking.providerTicketNo);
            }
            catch {
                // Continue with database record if provider details query fails
            }
        }
        // Prioritize actual 3rd party Ticket Number (e.g. 502627948, 502627910) per Transactionapi.md
        let ticketNo = booking.providerTicketNo ||
            gdsDetails?.TicketNo ||
            (booking.ticket?.ticketNumber && !booking.ticket.ticketNumber.startsWith('TKT-') ? booking.ticket.ticketNumber : null) ||
            booking.ticket?.ticketNumber ||
            booking.bookingNumber;
        const pnrNo = booking.providerPnrNo ||
            gdsDetails?.PNRNo ||
            booking.ticket?.pnrNumber ||
            'N/A';
        // Synchronize booking provider fields if live GDS details provided them
        if (gdsDetails?.TicketNo && !booking.providerTicketNo) {
            try {
                await prisma.booking.update({
                    where: { id: booking.id },
                    data: {
                        providerTicketNo: String(gdsDetails.TicketNo),
                        ...(gdsDetails.PNRNo && !booking.providerPnrNo ? { providerPnrNo: String(gdsDetails.PNRNo) } : {}),
                    },
                });
                booking.providerTicketNo = String(gdsDetails.TicketNo);
                if (gdsDetails.PNRNo)
                    booking.providerPnrNo = String(gdsDetails.PNRNo);
                ticketNo = String(gdsDetails.TicketNo);
            }
            catch {
                // Safe ignore
            }
        }
        // Synchronize ticket record if it previously held synthetic TKT- prefix
        if (booking.ticket && ticketNo && booking.ticket.ticketNumber.startsWith('TKT-')) {
            try {
                await prisma.ticket.update({
                    where: { id: booking.ticket.id },
                    data: { ticketNumber: String(ticketNo) },
                });
                booking.ticket.ticketNumber = String(ticketNo);
            }
            catch {
                // Safe ignore on race
            }
        }
        // Create ticket record if missing for confirmed booking
        if (!booking.ticket && booking.status === 'CONFIRMED' && ticketNo && !ticketNo.startsWith('TKT-')) {
            try {
                const created = await prisma.ticket.create({
                    data: {
                        bookingId: booking.id,
                        ticketNumber: String(ticketNo),
                        pnrNumber: String(pnrNo),
                        status: 'ISSUED',
                        bookingSnapshot: booking,
                    },
                });
                booking.ticket = created;
            }
            catch {
                // Safe ignore
            }
        }
        const status = booking.ticket?.status || (booking.status === 'CONFIRMED' ? 'ISSUED' : booking.status);
        return {
            id: booking.ticket?.id || booking.id,
            bookingId: booking.id,
            ticketNumber: ticketNo,
            pnrNumber: pnrNo,
            status,
            pdfUrl: booking.ticket?.pdfUrl || null,
            generatedAt: booking.ticket?.generatedAt || booking.confirmedAt || booking.createdAt,
            ticket: booking.ticket,
            booking,
            gdsDetails,
        };
    }
    async getTicketByTicketNumber(ticketNumber) {
        const prisma = (0, database_1.getPrismaClient)();
        // Look up by ticket table ticketNumber, or booking.providerTicketNo, or booking.providerPnrNo
        let ticket = await prisma.ticket.findUnique({
            where: { ticketNumber },
            include: {
                booking: {
                    include: {
                        seats: true,
                        passengers: true,
                        payments: true,
                        cancellations: true,
                    },
                },
            },
        });
        if (!ticket) {
            const booking = await prisma.booking.findFirst({
                where: {
                    OR: [
                        { providerTicketNo: ticketNumber },
                        { providerPnrNo: ticketNumber },
                        { bookingNumber: ticketNumber },
                    ],
                },
                include: {
                    seats: true,
                    passengers: true,
                    ticket: true,
                    payments: true,
                    cancellations: true,
                },
            });
            if (!booking) {
                throw new errors_1.NotFoundError('Ticket or booking not found');
            }
            let gdsDetails = null;
            if (booking.providerPnrNo && booking.providerTicketNo) {
                try {
                    gdsDetails = await this.gdsAdapter.getBookingDetails(booking.providerPnrNo, booking.providerTicketNo);
                }
                catch {
                    // Provider fetch optional
                }
            }
            let ticketNo = booking.providerTicketNo ||
                gdsDetails?.TicketNo ||
                (booking.ticket?.ticketNumber && !booking.ticket.ticketNumber.startsWith('TKT-') ? booking.ticket.ticketNumber : null) ||
                booking.ticket?.ticketNumber ||
                booking.bookingNumber;
            const pnrNo = booking.providerPnrNo ||
                gdsDetails?.PNRNo ||
                booking.ticket?.pnrNumber ||
                'N/A';
            if (booking.ticket && booking.providerTicketNo && booking.ticket.ticketNumber.startsWith('TKT-')) {
                try {
                    await prisma.ticket.update({
                        where: { id: booking.ticket.id },
                        data: { ticketNumber: booking.providerTicketNo },
                    });
                    booking.ticket.ticketNumber = booking.providerTicketNo;
                    ticketNo = booking.providerTicketNo;
                }
                catch {
                    // Safe ignore
                }
            }
            const status = booking.ticket?.status || (booking.status === 'CONFIRMED' ? 'ISSUED' : booking.status);
            return {
                id: booking.ticket?.id || booking.id,
                bookingId: booking.id,
                ticketNumber: ticketNo,
                pnrNumber: pnrNo,
                status,
                pdfUrl: booking.ticket?.pdfUrl || null,
                generatedAt: booking.ticket?.generatedAt || booking.confirmedAt || booking.createdAt,
                ticket: booking.ticket,
                booking,
                gdsDetails,
            };
        }
        let gdsDetails = null;
        if (ticket.booking?.providerPnrNo && ticket.booking?.providerTicketNo) {
            try {
                gdsDetails = await this.gdsAdapter.getBookingDetails(ticket.booking.providerPnrNo, ticket.booking.providerTicketNo);
            }
            catch {
                // Optional
            }
        }
        let ticketNo = ticket.booking?.providerTicketNo ||
            gdsDetails?.TicketNo ||
            (!ticket.ticketNumber.startsWith('TKT-') ? ticket.ticketNumber : null) ||
            ticket.ticketNumber ||
            ticket.booking?.bookingNumber;
        const pnrNo = ticket.booking?.providerPnrNo ||
            gdsDetails?.PNRNo ||
            ticket.pnrNumber ||
            'N/A';
        if (ticket.booking?.providerTicketNo && ticket.ticketNumber.startsWith('TKT-')) {
            try {
                await prisma.ticket.update({
                    where: { id: ticket.id },
                    data: { ticketNumber: ticket.booking.providerTicketNo },
                });
                ticket.ticketNumber = ticket.booking.providerTicketNo;
                ticketNo = ticket.booking.providerTicketNo;
            }
            catch {
                // Safe ignore
            }
        }
        return {
            id: ticket.id,
            bookingId: ticket.bookingId,
            ticketNumber: ticketNo,
            pnrNumber: pnrNo,
            status: ticket.status,
            pdfUrl: ticket.pdfUrl || null,
            generatedAt: ticket.generatedAt,
            ticket,
            booking: ticket.booking,
            gdsDetails,
        };
    }
    async generateTicketPdfBuffer(bookingIdentifier) {
        const details = await this.getTicketByBookingId(bookingIdentifier);
        const booking = details.booking;
        if (!booking) {
            throw new errors_1.NotFoundError('Booking record not found for PDF generation');
        }
        const pdfData = {
            bookingNumber: booking.bookingNumber,
            ticketNumber: String(details.ticketNumber),
            pnrNumber: String(details.pnrNumber),
            operatorName: booking.operatorName,
            busType: booking.busType,
            journeyDate: booking.journeyDate,
            fromCityName: booking.fromCityName,
            toCityName: booking.toCityName,
            pickupLocation: booking.pickupLocation,
            pickupTime: booking.pickupTime,
            dropoffLocation: booking.dropoffLocation,
            dropoffTime: booking.dropoffTime,
            totalFare: Number(booking.totalFare),
            contactName: booking.contactName,
            contactPhone: booking.contactPhone,
            passengers: (booking.passengers || []).map((p) => ({
                name: p.name,
                age: p.age,
                gender: p.gender,
                seatNo: p.seatNo,
            })),
        };
        const buffer = await (0, ticketPdfGenerator_1.generateTicketPdf)(pdfData);
        const fileName = `AiBus-Ticket-${details.ticketNumber || booking.bookingNumber}.pdf`;
        return { buffer, fileName };
    }
}
exports.TicketsService = TicketsService;
//# sourceMappingURL=tickets.service.js.map