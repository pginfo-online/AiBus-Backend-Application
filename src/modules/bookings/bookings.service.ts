import { HoldsService } from '../holds/holds.service';
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
  AuthorizationError,
} from '../../shared/errors';
import { logger } from '../../infrastructure/logger';
import { CreateBookingInput, CreateCheckoutSessionInput } from './bookings.validation';
import { BookingStatus, HoldStatus, TicketStatus, AgentStatus } from '@prisma/client';
import { resolveCommission } from '../../infrastructure/commission';
import { CouponsService } from '../coupons/coupons.service';

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

  public async createBooking(
    input: CreateBookingInput,
    userId?: string,
    explicitAgentId?: string
  ) {
    const prisma = getPrismaClient();

    // Determine agent context
    let agentId: string | null = explicitAgentId || null;
    if (!agentId && userId && prisma.agentStaff) {
      const staff = await prisma.agentStaff.findFirst({
        where: { userId, isActive: true },
        include: { agent: true },
      });
      if (staff?.agent) {
        if (staff.agent.status !== AgentStatus.APPROVED) {
          throw new AuthorizationError(
            `Agent account is not approved to create bookings. Current status: ${staff.agent.status}`
          );
        }
        agentId = staff.agent.id;
      }
    }

    if (!input.holdId) throw new ValidationError('An active seat hold is required');
    if (input.useWallet && (!userId || agentId)) throw new ValidationError('Customer wallet requires a retail account');
    const checkCheckoutPreferences = (existing: { dropoffSnapshot: unknown; walletAmount: unknown }) => {
      const snapshot = existing.dropoffSnapshot as { couponMetadata?: { code?: string }; checkoutMetadata?: { useWallet?: boolean } } | null;
      const requestedWallet = snapshot?.checkoutMetadata?.useWallet ?? (Number(existing.walletAmount) > 0);
      if ((snapshot?.couponMetadata?.code || '').toUpperCase() !== (input.couponCode || '').toUpperCase()
        || requestedWallet !== Boolean(input.useWallet)) {
        throw new ConflictError('Checkout already exists with different wallet or offer preferences. Resume the existing payment.');
      }
    };
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.holdId);
    const hold = isUuid
      ? await prisma.seatHold.findUnique({ where: { id: input.holdId } })
      : await prisma.seatHold.findUnique({
          where: { providerName_providerHoldId: { providerName: 'GDS', providerHoldId: input.holdId } },
        });
    if (!hold || hold.userId !== (userId ?? null) || (!hold.userId && !isUuid)) {
      throw new NotFoundError('Seat hold not found');
    }
    if (hold.status !== HoldStatus.ACTIVE || hold.expiresAt <= new Date()) {
      throw new ValidationError('Seat hold expired or unavailable');
    }
    if (hold.fromCityId !== input.fromCityId || hold.toCityId !== input.toCityId
      || hold.busId !== input.busId || hold.journeyDate !== input.journeyDate) {
      throw new ValidationError('Booking does not match the held trip');
    }
    if (hold.bookingId) {
      const existing = await prisma.booking.findUnique({
        where: { id: hold.bookingId }, include: { seats: true, passengers: true },
      });
      if (existing && (existing.status === BookingStatus.HELD || existing.status === BookingStatus.PAYMENT_PENDING || existing.status === BookingStatus.PAYMENT_SUCCESS || existing.status === BookingStatus.CONFIRMED)) {
        checkCheckoutPreferences(existing);
        return existing;
      }
      throw new ConflictError('Seat hold is already linked to a booking');
    }

    const passengers = hold.seats as unknown as (CreateBookingInput['passengers'][number]
      & { baseFare: number; serviceTax: number })[];
    if (!Array.isArray(passengers) || !passengers.length
      || passengers.some((p) => !Number.isFinite(p.fare) || !Number.isFinite(p.baseFare))) {
      throw new ValidationError('Seat pricing is unavailable. Please hold your seats again.');
    }
    const totalFare = passengers.reduce((sum, p) => sum + Math.round(p.fare * 100), 0) / 100;
    const baseFare = passengers.reduce((sum, p) => sum + Math.round(p.baseFare * 100), 0) / 100;
    const serviceTax = Math.round((totalFare - baseFare) * 100) / 100;
    const providerHoldId = hold.providerHoldId;

    const context = hold.passengerContext as { pickupId?: string; dropoffId?: string; journey?: { operatorName?: string; busType?: string; cancellationPolicy?: unknown; pickupSnapshot?: Record<string, string>; dropoffSnapshot?: Record<string, string> } } | null;
    if ((context?.pickupId && context.pickupId !== input.pickupCode) || (context?.dropoffId && context.dropoffId !== input.dropoffCode)) throw new ValidationError('Pickup and dropping points must match the held journey');
    const verified = context?.journey;
    let operatorName = verified?.operatorName || input.operatorName;
    let busType = verified?.busType || input.busType;
    if (!verified?.operatorName || !verified?.busType) {
      const buses = await this.gdsAdapter.searchBus({
        busId: hold.busId, fromCityId: hold.fromCityId, toCityId: hold.toCityId, journeyDate: hold.journeyDate,
      });
      const bus = buses.find((bus) => bus.RouteBusId === hold.busId);
      if (!bus) throw new ValidationError('Operator could not be verified for the selected trip');
      operatorName = bus.CompanyName;
      busType = bus.BusTypeName;
    }

    // Resolve B2B commission if agent booking
    let commissionResult = null;
    if (agentId) {
      commissionResult = await resolveCommission({
        agentId,
        grossFare: totalFare,
        baseFare: baseFare,
        fromCityId: input.fromCityId,
        toCityId: input.toCityId,
        operatorName,
        journeyDate: input.journeyDate,
      });
    }

    // 2. Authoritative Coupon Validation & Discount Calculation
    let couponDiscount = 0;
    let appliedCoupon: any = null;
    let effectivePayableFare = totalFare;

    if (agentId && input.couponCode) throw new ValidationError('Offers apply to retail checkout');
    if (input.couponCode) {
      const couponsService = CouponsService.getInstance();
      const validation = await couponsService.validateCoupon({
        code: input.couponCode,
        totalFare: totalFare,
        operatorName,
        fromCityId: input.fromCityId,
        toCityId: input.toCityId,
        busId: input.busId,
        userId: userId ?? undefined,
      });
      couponDiscount = validation.discountAmount;
      effectivePayableFare = validation.finalPayableAmount;
      appliedCoupon = validation.coupon;
    }

    if (!agentId && effectivePayableFare < 1) {
      throw new ValidationError('Razorpay checkout requires a payable fare of at least INR 1');
    }

    // 4. Generate unique booking number
    const bookingNumber = this.generateBookingNumber();

    // 5. Persist Booking, Seats, Passengers, and CommissionSnapshot in atomic transaction
    const booking = await prisma.$transaction(async (tx) => {
      const dropoffSnapshotWithCoupon = {
        ...(verified?.dropoffSnapshot || input.dropoffSnapshot || {}),
        checkoutMetadata: { useWallet: Boolean(input.useWallet) },
        couponMetadata: appliedCoupon
          ? {
              id: appliedCoupon.id,
              code: appliedCoupon.code,
              discount: couponDiscount,
            }
          : null,
      };

      // Serializing the hold prevents duplicate bookings and duplicate wallet debits.
      await tx.$queryRaw`SELECT id FROM seat_holds WHERE id = ${hold.id}::uuid FOR UPDATE`;
      const currentHold = await tx.seatHold.findUniqueOrThrow({ where: { id: hold.id } });
      if (currentHold.bookingId) {
        const existing = await tx.booking.findUniqueOrThrow({ where: { id: currentHold.bookingId }, include: { seats: true, passengers: true } });
        checkCheckoutPreferences(existing);
        return existing;
      }
      let walletAmount = 0;
      if (input.useWallet && userId) {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
        const customer = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { walletBalance: true } });
        walletAmount = Math.min(Number(customer.walletBalance), effectivePayableFare);
        // Razorpay's minimum order is INR 1; keep any fractional remainder in the wallet.
        if (effectivePayableFare - walletAmount > 0 && effectivePayableFare - walletAmount < 1) walletAmount = Math.max(0, effectivePayableFare - 1);
        walletAmount = Math.round(walletAmount * 100) / 100;
      }
      const createdBooking = await tx.booking.create({
        data: {
          userId: userId ?? null,
          agentId: agentId ?? null,
          userType: agentId ? 'AGENT' : 'CUSTOMER',
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
          pickupLocation: verified?.pickupSnapshot?.name || input.pickupLocation,
          pickupTime: verified?.pickupSnapshot?.time || input.pickupTime,
          dropoffCode: input.dropoffCode,
          dropoffLocation: verified?.dropoffSnapshot?.name || input.dropoffLocation,
          dropoffTime: verified?.dropoffSnapshot?.time || input.dropoffTime,
          operatorName,
          busType,
          totalFare: effectivePayableFare,
          walletAmount,
          baseFare: baseFare,
          serviceTax: serviceTax,
          discountAmount: couponDiscount,
          passengerContext: hold.passengerContext ?? undefined,
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          cancellationPolicy: (verified?.cancellationPolicy ?? input.cancellationPolicy ?? null) as any,
          pickupSnapshot: verified?.pickupSnapshot || input.pickupSnapshot || null,
          dropoffSnapshot: dropoffSnapshotWithCoupon,
          seats: {
            create: passengers.map((p) => ({
              seatNo: p.seatNo,
              seatTypeId: p.seatTypeId,
              fareTotal: p.fare,
              fareBase: p.baseFare,
              fareTax: p.serviceTax,
            })),
          },
          passengers: {
            create: passengers.map((p) => ({
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

      if (walletAmount > 0 && userId) {
        const customer = await tx.user.update({ where: { id: userId }, data: { walletBalance: { decrement: walletAmount } } });
        await tx.walletTransaction.create({ data: { userId, type: 'DEBIT', amount: walletAmount, balanceAfter: customer.walletBalance, referenceType: 'BOOKING', referenceId: createdBooking.id, description: `Wallet payment for ${createdBooking.bookingNumber}` } });
        if (walletAmount === effectivePayableFare) {
          const walletPayment = await tx.payment.create({ data: { bookingId: createdBooking.id, userId, merchantTxnId: `WALLET-${createdBooking.id}`, amount: walletAmount, gateway: 'WALLET', status: 'SUCCESS', paymentMethod: 'WALLET' } });
          await tx.booking.update({ where: { id: createdBooking.id }, data: { status: BookingStatus.PAYMENT_SUCCESS, paidPaymentId: walletPayment.id } });
          createdBooking.status = BookingStatus.PAYMENT_SUCCESS;
        }
      }
      // Reserve coupon usage atomically with checkout so concurrent checkouts cannot reuse a limited offer.
      if (appliedCoupon && userId) await CouponsService.getInstance().recordCouponUsage(appliedCoupon.id, userId, createdBooking.id, couponDiscount, tx);
      // Save immutable CommissionSnapshot for B2B booking
      if (agentId && commissionResult) {
        await tx.commissionSnapshot.create({
          data: {
            bookingId: createdBooking.id,
            agentId,
            ruleId: commissionResult.ruleId,
            ruleSnapshot: commissionResult.ruleSnapshot ? (commissionResult.ruleSnapshot as any) : {},
            grossFare: totalFare,
            baseFareForCommission: baseFare,
            commissionRate: commissionResult.commissionRate,
            commissionAmt: commissionResult.commissionAmt,
            netFare: commissionResult.netFare,
          },
        });
      }

      const linked = await tx.seatHold.updateMany({
        where: { id: hold.id, bookingId: null, status: HoldStatus.ACTIVE, expiresAt: { gt: new Date() } },
        data: { bookingId: createdBooking.id },
      });
      if (!linked.count) throw new ConflictError('Seat hold expired or was already used');

      return createdBooking;
    });

    this.bookingLogger.info(
      { bookingId: booking.id, bookingNumber: booking.bookingNumber },
      'Booking created in HELD status — awaiting payment verification before GDS BookSeats'
    );

    // NOTE: GDS BookSeats (confirmBooking) must ONLY be called after payment verification.
    // The payment lifecycle is: HELD → PAYMENT_PENDING → PAYMENT_SUCCESS → CONFIRMED.
    // Confirmation runs in a background worker after durable payment persistence.
    return booking;
  }

  /**
   * Unified Checkout Session Creation:
   * Consolidates Booking persistence + Gateway Intent generation in a single atomic pipeline.
   * Eliminates 3 separate mobile network hops and ensures instant checkout launch.
   */
  public async createCheckoutSession(
    input: CreateCheckoutSessionInput,
    userId?: string,
    explicitAgentId?: string
  ) {
    // 1. Create or retrieve existing booking for active hold
    const booking = await this.createBooking(input, userId, explicitAgentId);

    if (booking.agentId) return { booking, paymentIntent: null };

    if (Number(booking.totalFare) === Number(booking.walletAmount)) {
      await addJob(QueueName.BOOKING_RECONCILIATION, 'complete-paid-booking', { bookingId: booking.id, providerHoldId: booking.providerHoldId });
      return { booking, paymentIntent: null };
    }
    // 2. Generate payment intent via PaymentsService
    const { PaymentsService } = await import('../payments/payments.service');
    const paymentsService = PaymentsService.getInstance();
    const paymentIntent = await paymentsService.createPaymentIntent(
      {
        bookingId: booking.id,
        gateway: (input.gateway as any) || 'RAZORPAY',
        paymentMode: input.paymentMode as any,
        redirectUrl: input.redirectUrl,
      },
      userId
    );

    return {
      booking,
      paymentIntent,
    };
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

    // Claim once; a concurrent worker must not submit BookSeats again.
    const claim = await prisma.booking.updateMany({
      where: { id: bookingId, version: booking.version, status: BookingStatus.PAYMENT_SUCCESS },
      data: {
        status: BookingStatus.BOOKING_REQUESTED,
        version: { increment: 1 },
      },
    });

    if (!claim.count) return prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { seats: true, passengers: true } });

    try {
      // Call GDS BookSeats
      const bookRes = await this.gdsAdapter.bookSeats(
        booking.providerHoldId,
        booking.seats.reduce((sum, seat) => sum + Number(seat.fareTotal), 0)
      );

      if (bookRes.Status !== 1 || !bookRes.TicketNo || !bookRes.PNRNo) {
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
            where: { bookingId: booking.id, providerHoldId: booking.providerHoldId },
            data: { status: HoldStatus.CONVERTED },
          });
        }

        // Generate Ticket record using actual 3rd party provider TicketNo (per Transactionapi.md)
        const ticketNumber = String(bookRes.TicketNo);
        const createdTicket = await tx.ticket.upsert({
          where: { bookingId: updated.id }, update: { ticketNumber, pnrNumber: bookRes.PNRNo, status: TicketStatus.ISSUED },
          create: {
            bookingId: updated.id,
            ticketNumber,
            pnrNumber: bookRes.PNRNo,
            status: TicketStatus.ISSUED,
            bookingSnapshot: updated as any,
          },
        });

        return { ...updated, ticket: createdTicket };
      });

      await addJob(QueueName.TICKET_GENERATION, 'enrich-ticket', { bookingId: confirmedBooking.id }, { jobId: `ticket-${confirmedBooking.id}` });
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

      // A failed call or local commit can leave a valid ticket at the operator.
      const unknown = await prisma.booking.updateMany({
        where: { id: bookingId, status: BookingStatus.BOOKING_REQUESTED },
        data: { status: BookingStatus.BOOKING_UNKNOWN, version: { increment: 1 } },
      });
      if (unknown.count) {
        await addJob(
          QueueName.BOOKING_RECONCILIATION,
          'reconcile-unknown-booking',
          { bookingId, providerHoldId: booking.providerHoldId },
          { delay: 10000, attempts: 5, backoff: { type: 'exponential', delay: 5000 } }
        );
      }

      throw err;
    }
  }

  public async getBooking(id: string, userId?: string) {
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
            refunds: true,
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
            refunds: true,
          },
        });

    if (!booking || (booking.userId ? booking.userId !== userId : !isUuid)) {
      throw new NotFoundError('Booking not found');
    }

    return booking;
  }

  public async getUserBookings(userId: string, options?: { limit: number; cursor?: string; filter?: string }) {
    const prisma = getPrismaClient();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const active: BookingStatus[] = [BookingStatus.HELD, BookingStatus.PAYMENT_PENDING, BookingStatus.PAYMENT_SUCCESS, BookingStatus.BOOKING_REQUESTED, BookingStatus.BOOKING_UNKNOWN, BookingStatus.CONFIRMED, BookingStatus.CANCELLATION_REQUESTED];
    const filters = options?.filter === 'CANCELLED' ? { cancelledAt: { not: null } }
      : options?.filter === 'UPCOMING' ? { cancelledAt: null, journeyDate: { gte: today }, status: { in: active } }
      : options?.filter === 'PAST_TRIPS' ? { cancelledAt: null, OR: [{ journeyDate: { lt: today } }, { status: { notIn: active } }] } : {};
    const limit = options?.limit ?? 100;
    const rows = await prisma.booking.findMany({
      where: { userId, ...filters },
      include: { seats: true, passengers: true, ticket: { select: { ticketNumber: true, pnrNumber: true, status: true } }, refunds: { select: { id: true, amount: true, status: true, destination: true, completedAt: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + (options ? 1 : 0),
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
    if (!options) return rows;
    return { items: rows.slice(0, limit), nextCursor: rows.length > limit ? rows[limit - 1].id : null };
  }

  public async checkBookingStatus(
    input: { holdId?: string; HoldId?: string; bookingId?: string; bookingNumber?: string },
    userId?: string,
  ) {
    const bookingId = input.bookingId || input.bookingNumber;
    const holdId = input.holdId || input.HoldId;
    const booking = bookingId ? await this.getBooking(bookingId, userId) : null;
    if (booking?.status === BookingStatus.CONFIRMED && booking.providerTicketNo && booking.providerPnrNo) {
      return { Status: 1, Message: 'Booking is confirmed', TicketNo: booking.providerTicketNo, PNRNo: booking.providerPnrNo };
    }
    if (booking && [BookingStatus.CANCELLED, BookingStatus.REFUNDED].some((status) => status === booking.status)) {
      return { Status: -1, Message: 'Booking is cancelled or refunded' };
    }
    if (booking?.providerHoldId) return this.gdsAdapter.checkBookingStatus(booking.providerHoldId);
    if (!holdId) throw new ValidationError('HoldId or BookingId is required');
    return HoldsService.getInstance().checkHoldStatus(holdId, userId);
  }

  private generateBookingNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `AIB-${datePart}-${randomPart}`;
  }
}
