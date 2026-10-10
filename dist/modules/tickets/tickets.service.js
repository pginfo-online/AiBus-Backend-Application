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
        return {
            ticketNumber: booking.ticket?.ticketNumber || `TKT-${booking.bookingNumber}`,
            pnrNumber: booking.ticket?.pnrNumber || booking.providerPnrNo || 'N/A',
            status: booking.ticket?.status || 'ISSUED',
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
            return {
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
        return {
            ticket,
            booking: ticket.booking,
            gdsDetails,
        };
    }
}
exports.TicketsService = TicketsService;
//# sourceMappingURL=tickets.service.js.map