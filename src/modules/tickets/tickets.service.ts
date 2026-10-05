import { getPrismaClient } from '../../infrastructure/database';
import { NotFoundError } from '../../shared/errors';

export class TicketsService {
  private static instance: TicketsService;

  private constructor() {}

  public static getInstance(): TicketsService {
    if (!TicketsService.instance) {
      TicketsService.instance = new TicketsService();
    }
    return TicketsService.instance;
  }

  public async getTicketByBookingId(bookingId: string) {
    const prisma = getPrismaClient();

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
      throw new NotFoundError('Ticket not found for this booking');
    }

    return ticket;
  }

  public async getTicketByTicketNumber(ticketNumber: string) {
    const prisma = getPrismaClient();

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
      throw new NotFoundError('Ticket not found');
    }

    return ticket;
  }
}
