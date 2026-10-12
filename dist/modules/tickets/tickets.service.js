"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsService = void 0;
const database_1 = require("../../infrastructure/database");
const errors_1 = require("../../shared/errors");
const gdsAdapter_1 = require("../../providers/gds/gdsAdapter");
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
        // Prioritize actual 3rd party Ticket Number (e.g. 502627948) per Transactionapi.md
        let ticketNo = booking.providerTicketNo ||
            gdsDetails?.TicketNo ||
            (booking.ticket?.ticketNumber && !booking.ticket.ticketNumber.startsWith('TKT-') ? booking.ticket.ticketNumber : null) ||
            booking.ticket?.ticketNumber ||
            booking.bookingNumber;
        const pnrNo = booking.providerPnrNo ||
            gdsDetails?.PNRNo ||
            booking.ticket?.pnrNumber ||
            'N/A';
        // Synchronize ticket record if it previously held synthetic TKT- prefix
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
                // Safe ignore on race
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
}
exports.TicketsService = TicketsService;
//# sourceMappingURL=tickets.service.js.map