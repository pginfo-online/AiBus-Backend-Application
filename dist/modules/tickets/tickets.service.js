"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsService = void 0;
const database_1 = require("../../infrastructure/database");
const errors_1 = require("../../shared/errors");
class TicketsService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!TicketsService.instance) {
            TicketsService.instance = new TicketsService();
        }
        return TicketsService.instance;
    }
    async getTicketByBookingId(bookingId) {
        const prisma = (0, database_1.getPrismaClient)();
        const ticket = await prisma.ticket.findUnique({
            where: { bookingId },
            include: {
                booking: {
                    include: {
                        seats: true,
                        passengers: true,
                    },
                },
            },
        });
        if (!ticket) {
            throw new errors_1.NotFoundError('Ticket not found for this booking');
        }
        return ticket;
    }
    async getTicketByTicketNumber(ticketNumber) {
        const prisma = (0, database_1.getPrismaClient)();
        const ticket = await prisma.ticket.findUnique({
            where: { ticketNumber },
            include: {
                booking: {
                    include: {
                        seats: true,
                        passengers: true,
                    },
                },
            },
        });
        if (!ticket) {
            throw new errors_1.NotFoundError('Ticket not found');
        }
        return ticket;
    }
}
exports.TicketsService = TicketsService;
//# sourceMappingURL=tickets.service.js.map