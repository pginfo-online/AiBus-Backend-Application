import { getPrismaClient } from '../../infrastructure/database';
import { NotFoundError } from '../../shared/errors';
import { GdsAdapter } from '../../providers/gds/gdsAdapter';
import { generateTicketPdf, TicketPdfData } from '../../infrastructure/pdf/ticketPdfGenerator';

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

    // Prioritize actual 3rd party Ticket Number (e.g. 502627948, 502627910) per Transactionapi.md
    let ticketNo =
      booking.providerTicketNo ||
      gdsDetails?.TicketNo ||
      (booking.ticket?.ticketNumber && !booking.ticket.ticketNumber.startsWith('TKT-') ? booking.ticket.ticketNumber : null) ||
      booking.ticket?.ticketNumber ||
      booking.bookingNumber;

    const pnrNo =
      booking.providerPnrNo ||
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
        if (gdsDetails.PNRNo) booking.providerPnrNo = String(gdsDetails.PNRNo);
        ticketNo = String(gdsDetails.TicketNo);
      } catch {
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
      } catch {
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
            bookingSnapshot: booking as any,
          },
        });
        booking.ticket = created;
      } catch {
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

      let ticketNo =
        booking.providerTicketNo ||
        gdsDetails?.TicketNo ||
        (booking.ticket?.ticketNumber && !booking.ticket.ticketNumber.startsWith('TKT-') ? booking.ticket.ticketNumber : null) ||
        booking.ticket?.ticketNumber ||
        booking.bookingNumber;

      const pnrNo =
        booking.providerPnrNo ||
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
        } catch {
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
        gdsDetails = await this.gdsAdapter.getBookingDetails(
          ticket.booking.providerPnrNo,
          ticket.booking.providerTicketNo
        );
      } catch {
        // Optional
      }
    }

    let ticketNo =
      ticket.booking?.providerTicketNo ||
      gdsDetails?.TicketNo ||
      (!ticket.ticketNumber.startsWith('TKT-') ? ticket.ticketNumber : null) ||
      ticket.ticketNumber ||
      ticket.booking?.bookingNumber;

    const pnrNo =
      ticket.booking?.providerPnrNo ||
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
      } catch {
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

  public async generateTicketPdfBuffer(
    bookingIdentifier: string
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const details = await this.getTicketByBookingId(bookingIdentifier);
    const booking = details.booking as any;
    if (!booking) {
      throw new NotFoundError('Booking record not found for PDF generation');
    }

    const pdfData: TicketPdfData = {
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
      passengers: (booking.passengers || []).map((p: any) => ({
        name: p.name,
        age: p.age,
        gender: p.gender,
        seatNo: p.seatNo,
      })),
    };

    const buffer = await generateTicketPdf(pdfData);
    const fileName = `AiBus-Ticket-${details.ticketNumber || booking.bookingNumber}.pdf`;
    return { buffer, fileName };
  }
}
