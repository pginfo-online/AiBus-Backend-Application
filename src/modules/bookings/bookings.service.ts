import { v4 as uuidv4 } from 'uuid';
import { env, isDevelopment } from '../../config/env';
import { getPrismaClient } from '../../infrastructure/database';
import { GdsAdapter } from '../../providers/gds/gdsAdapter';
import { addJob } from '../../infrastructure/queues';
import { QueueName } from '../../shared/constants';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  ProviderError,
} from '../../shared/errors';
import { logger } from '../../infrastructure/logger';
import { CreateBookingInput } from './bookings.validation';
import { BookingStatus, HoldStatus, TicketStatus } from '@prisma/client';

export class BookingsService {
  private static instance: BookingsService;
  private gdsAdapter: GdsAdapter;
  private bookingLogger = logger.child({ module: 'bookings-service' });

  private constructor() {
    this.gdsAdapter = GdsAdapter.getInstance();
  }

  public static getInstance(): BookingsService {
    if (!BookingsService.instance) {
      BookingsService.instance = new BookingsService();
    }
    return BookingsService.instance;
  }

  public async createBooking(input: CreateBookingInput, userId?: string) {
    const prisma = getPrismaClient();

    // 1. Verify hold exists if a valid UUID holdId was provided
    let providerHoldId = `HOLD-GDS-${Date.now()}`;
    let holdRecordId: string | null = null;

    if (input.holdId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.holdId);
      if (isUuid) {
        const hold = await prisma.seatHold.findUnique({
          where: { id: input.holdId },
        });

        if (hold) {
          if (hold.status !== HoldStatus.ACTIVE) {
            throw new ValidationError(`Cannot create booking: Hold status is ${hold.status}`);
          }

          if (new Date() > hold.expiresAt) {
            await prisma.seatHold.update({
              where: { id: hold.id },
              data: { status: HoldStatus.EXPIRED },
            });
            throw new ValidationError('Seat hold has expired. Please select seats again.');
          }

          providerHoldId = hold.providerHoldId;
          holdRecordId = hold.id;
        }
      }
    }

    // 2. Generate unique booking number
    const bookingNumber = this.generateBookingNumber();

    // 3. Persist Booking, Seats, Passengers in atomic transaction
    const booking = await prisma.$transaction(async (tx) => {
      const createdBooking = await tx.booking.create({
        data: {
          userId: userId ?? null,
          bookingNumber,
          status: BookingStatus.HELD,
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

      // Link hold to booking if holdRecordId exists
      if (holdRecordId) {
        await tx.seatHold.update({
          where: { id: holdRecordId },
          data: { bookingId: createdBooking.id },
        });
      }

      return createdBooking;
    });

    this.bookingLogger.info(
      { bookingId: booking.id, bookingNumber: booking.bookingNumber },
      'Booking initiated successfully'
    );

    // 4. Confirm with Mantis GDS BookSeats (/ota/BookSeats)
    if (providerHoldId) {
      const confirmedBooking = await this.confirmBooking(booking.id);
      return confirmedBooking;
    }

    return booking;
  }

  /**
   * Complete booking against upstream provider once payment is verified
   */
  public async confirmBooking(bookingId: string) {
    const prisma = getPrismaClient();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { seats: true, passengers: true },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      return booking; // Already confirmed (idempotent)
    }

    if (!booking.providerHoldId) {
      throw new ValidationError('Booking is missing provider hold ID');
    }

    // Transition to BOOKING_REQUESTED
    await prisma.booking.update({
      where: { id: bookingId, version: booking.version },
      data: {
        status: BookingStatus.BOOKING_REQUESTED,
        version: { increment: 1 },
      },
    });

    try {
      // Call GDS BookSeats
      const bookRes = await this.gdsAdapter.bookSeats(
        booking.providerHoldId,
        Number(booking.totalFare)
      );

      if (bookRes.Status !== 1 || !bookRes.TicketNo) {
        throw new ProviderError('GDS', bookRes.Message || 'Booking failed at provider');
      }

      // Confirmed at provider!
      const confirmedBooking = await prisma.$transaction(async (tx) => {
        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: BookingStatus.CONFIRMED,
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
            data: { status: HoldStatus.CONVERTED },
          });
        }

        // Generate Ticket record
        const ticketNumber = `TKT-${booking.bookingNumber}`;
        await tx.ticket.create({
          data: {
            bookingId: updated.id,
            ticketNumber,
            pnrNumber: bookRes.PNRNo || 'N/A',
            status: TicketStatus.ISSUED,
            bookingSnapshot: updated as any,
          },
        });

        return updated;
      });

      // Queue confirmation notifications
      try {
        await addJob(QueueName.NOTIFICATION_EMAIL, 'booking-confirmation-email', {
          bookingId: confirmedBooking.id,
          recipient: confirmedBooking.contactEmail,
          bookingNumber: confirmedBooking.bookingNumber,
        });
        await addJob(QueueName.NOTIFICATION_SMS, 'booking-confirmation-sms', {
          bookingId: confirmedBooking.id,
          recipient: confirmedBooking.contactPhone,
          bookingNumber: confirmedBooking.bookingNumber,
        });
      } catch (queueErr) {
        this.bookingLogger.warn({ queueErr }, 'Failed to queue booking notifications');
      }

      this.bookingLogger.info(
        { bookingId: confirmedBooking.id, pnr: bookRes.PNRNo, ticketNo: bookRes.TicketNo },
        'Booking confirmed successfully'
      );

      return confirmedBooking;
    } catch (err: any) {
      this.bookingLogger.error(
        { err: err.message, bookingId },
        'Error during upstream BookSeats call'
      );

      // Distinguish network timeout from provider hard failure
      const isTimeout =
        err.code === 'ECONNABORTED' ||
        err.code === 'ETIMEDOUT' ||
        err.message?.includes('timeout') ||
        err.name === 'ProviderTimeoutError';

      if (isTimeout) {
        // Mark as BOOKING_UNKNOWN and queue reconciliation job!
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.BOOKING_UNKNOWN, version: { increment: 1 } },
        });

        await addJob(
          QueueName.BOOKING_RECONCILIATION,
          'reconcile-unknown-booking',
          { bookingId, providerHoldId: booking.providerHoldId },
          { delay: 10000, attempts: 5, backoff: { type: 'exponential', delay: 5000 } }
        );

        this.bookingLogger.warn(
          { bookingId },
          'Booking status UNKNOWN due to network timeout — queued for background reconciliation'
        );
      } else {
        // Provider hard rejection: transition to BOOKING_FAILED and queue refund
        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.BOOKING_FAILED, version: { increment: 1 } },
        });

        await addJob(QueueName.REFUND_PROCESSING, 'auto-refund-failed-booking', {
          bookingId,
          reason: 'Booking failed with provider',
          amount: Number(booking.totalFare),
        });

        this.bookingLogger.error(
          { bookingId },
          'Booking rejected by provider — marked BOOKING_FAILED and queued auto-refund'
        );
      }

      throw err;
    }
  }

  public async getBooking(id: string) {
    const prisma = getPrismaClient();
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
          },
        });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    return booking;
  }

  public async getUserBookings(userId: string) {
    const prisma = getPrismaClient();
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

  private generateBookingNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `AIB-${datePart}-${randomPart}`;
  }
}
