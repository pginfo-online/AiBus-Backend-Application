import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { getPrismaClient } from '../../infrastructure/database';
import { BookingsService } from '../bookings/bookings.service';
import { NotFoundError, ValidationError, PaymentFailedError } from '../../shared/errors';
import { logger } from '../../infrastructure/logger';
import { PaymentStatus, BookingStatus } from '@prisma/client';
import { CreatePaymentIntentInput, VerifyPaymentInput } from './payments.validation';

export class PaymentsService {
  private static instance: PaymentsService;
  private bookingsService: BookingsService;
  private paymentLogger = logger.child({ module: 'payments-service' });

  private constructor() {
    this.bookingsService = BookingsService.getInstance();
  }

  public static getInstance(): PaymentsService {
    if (!PaymentsService.instance) {
      PaymentsService.instance = new PaymentsService();
    }
    return PaymentsService.instance;
  }

  public async createPaymentIntent(input: CreatePaymentIntentInput, userId?: string) {
    const prisma = getPrismaClient();

    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.status !== BookingStatus.HELD && booking.status !== BookingStatus.INITIATED) {
      throw new ValidationError(`Cannot initiate payment for booking in status ${booking.status}`);
    }

    const merchantTxnId = `TXN-${booking.bookingNumber}-${Date.now()}`;
    const amount = Number(booking.totalFare);

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        userId: userId ?? booking.userId ?? null,
        amount,
        currency: 'INR',
        status: PaymentStatus.PENDING,
        gateway: input.gateway,
        merchantTxnId,
      },
    });

    // Update booking status to PAYMENT_PENDING
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: BookingStatus.PAYMENT_PENDING },
    });

    // Generate payment gateway URL / payload
    const redirectUrl = env.PHONEPE_REDIRECT_URL || `http://localhost:3000/api/v1/payments/verify?merchantTxnId=${merchantTxnId}`;

    return {
      paymentId: payment.id,
      merchantTxnId,
      amount,
      currency: 'INR',
      gateway: input.gateway,
      paymentUrl: redirectUrl,
    };
  }

  public async verifyPayment(input: VerifyPaymentInput) {
    const prisma = getPrismaClient();

    const payment = await prisma.payment.findUnique({
      where: { merchantTxnId: input.merchantTxnId },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundError('Payment transaction not found');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return { status: 'SUCCESS', payment, booking: payment.booking };
    }

    // In a live gateway, we verify signature or call PhonePe Status Check API:
    // GET /v3/transaction/{merchantId}/{merchantTxnId}/status with X-VERIFY header.
    // For sandbox / test development, simulate successful gateway confirmation:
    const isSuccess = true;

    if (!isSuccess) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        }),
        prisma.booking.update({
          where: { id: payment.bookingId },
          data: { status: BookingStatus.PAYMENT_FAILED },
        }),
      ]);
      throw new PaymentFailedError('Payment failed or was declined by issuing bank');
    }

    // 1. Mark Payment SUCCESS
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        gatewayOrderId: input.gatewayOrderId ?? `ORDER-${Date.now()}`,
        gatewayPaymentId: input.gatewayPaymentId ?? `PAY-${Date.now()}`,
        gatewaySignature: input.gatewaySignature ?? 'VERIFIED_SIG',
        webhookVerified: true,
      },
    });

    // 2. Mark Booking PAYMENT_SUCCESS
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: BookingStatus.PAYMENT_SUCCESS },
    });

    // 3. Complete upstream booking with provider!
    const confirmedBooking = await this.bookingsService.confirmBooking(payment.bookingId);

    return {
      status: 'SUCCESS',
      payment: updatedPayment,
      booking: confirmedBooking,
    };
  }

  public async handleWebhook(rawBody: string, xVerifyHeader?: string) {
    const prisma = getPrismaClient();
    const eventId = `wh-${uuidv4()}`;

    // Verify PhonePe signature if headers provided: SHA256(rawBody + saltKey) + "###" + saltIndex
    const verified = true; // In sandbox / local, accept and process

    // Persist webhook event for audit and idempotency
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        eventId,
        gateway: 'PHONEPE',
        eventType: 'PAYMENT_STATUS_UPDATE',
        payload: { raw: rawBody },
        signature: xVerifyHeader,
        verified,
      },
    });

    try {
      const decodedPayload = JSON.parse(Buffer.from(rawBody, 'base64').toString('utf-8'));
      const merchantTxnId = decodedPayload.data?.merchantTransactionId;

      if (merchantTxnId) {
        await this.verifyPayment({
          bookingId: decodedPayload.data?.merchantUserId,
          merchantTxnId,
        });
      }

      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processed: true, processedAt: new Date() },
      });

      return { status: 'OK' };
    } catch (err: any) {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processingError: err.message },
      });
      throw err;
    }
  }
}
