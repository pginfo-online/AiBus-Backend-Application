import { getPrismaClient } from '../../infrastructure/database';
import { NotFoundError } from '../../shared/errors';
import { GdsAdapter } from '../../providers/gds/gdsAdapter';

export class TicketsService {
  private static instance: TicketsService;
  private gdsAdapter: GdsAdapter;

  private constructor() {
    this.gdsAdapter = GdsAdapter.getInstance();
  }

  public static getInstance(): TicketsService {
    if (!TicketsService.instance) {
      TicketsService.instance = new TicketsService();
    }
    return TicketsService.instance;
  }

  public async getGdsBookingDetails(pnr: string, ticketNo: string) {
    return this.gdsAdapter.getBookingDetails(pnr, ticketNo);
  }

  public async getTicketByBookingId(bookingIdentifier: string) {
    const prisma = getPrismaClient();

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
      throw new NotFoundError('Booking not found');
    }

    let gdsDetails = null;
    if (booking.providerPnrNo && booking.providerTicketNo) {
      try {
        gdsDetails = await this.gdsAdapter.getBookingDetails(booking.providerPnrNo, booking.providerTicketNo);
      } catch {
        // Continue with database record if provider details query fails
      }
    }

    return {
      ticket: booking.ticket,
      booking,
      gdsDetails,
    };
  }

  public async getTicketByTicketNumber(ticketNumber: string) {
    const prisma = getPrismaClient();

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
        throw new NotFoundError('Ticket or booking not found');
      }

      let gdsDetails = null;
      if (booking.providerPnrNo && booking.providerTicketNo) {
        try {
          gdsDetails = await this.gdsAdapter.getBookingDetails(booking.providerPnrNo, booking.providerTicketNo);
        } catch {
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
        gdsDetails = await this.gdsAdapter.getBookingDetails(
          ticket.booking.providerPnrNo,
          ticket.booking.providerTicketNo
        );
      } catch {
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
