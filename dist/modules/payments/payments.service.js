"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const redis_1 = require("../../infrastructure/redis");
const agents_service_1 = require("../agents/agents.service");
const uuid_1 = require("uuid");
const env_1 = require("../../config/env");
const database_1 = require("../../infrastructure/database");
const bookings_service_1 = require("../bookings/bookings.service");
const tickets_service_1 = require("../tickets/tickets.service");
const errors_1 = require("../../shared/errors");
const logger_1 = require("../../infrastructure/logger");
const client_1 = require("@prisma/client");
const ledger_1 = require("../../infrastructure/ledger");
const payments_1 = require("../../infrastructure/payments");
const coupons_service_1 = require("../coupons/coupons.service");
const paymentLogger = logger_1.logger.child({ module: 'payments-service' });
class PaymentsService {
    static instance;
    bookingsService;
    ticketsService;
    constructor() {
        this.bookingsService = bookings_service_1.BookingsService.getInstance();
        this.ticketsService = tickets_service_1.TicketsService.getInstance();
    }
    static getInstance() {
        if (!PaymentsService.instance) {
            PaymentsService.instance = new PaymentsService();
        }
        return PaymentsService.instance;
    }
    async createPaymentIntent(input, userId) {
        const key = `lock:payment-intent:${input.bookingId}`;
        const owner = (0, uuid_1.v4)();
        if (!await (0, redis_1.acquireLock)(key, owner, 30))
            throw new errors_1.ConflictError('Payment initiation is in progress');
        try {
            return await this.createRazorpayIntent(input, userId);
        }
        finally {
            await (0, redis_1.releaseLock)(key, owner).catch(() => paymentLogger.warn('Could not release payment intent lock'));
        }
    }
    async createRazorpayIntent(input, userId) {
        const prisma = (0, database_1.getPrismaClient)();
        const booking = await prisma.booking.findUnique({
            where: { id: input.bookingId },
            include: { holds: true },
        });
        if (!booking || (booking.userId && booking.userId !== userId)) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        if (booking.agentId)
            throw new errors_1.ValidationError('Agent bookings must be paid from the agent wallet');
        if (booking.status === client_1.BookingStatus.CONFIRMED) {
            throw new errors_1.ValidationError('Booking is already confirmed and completed');
        }
        if (booking.status === client_1.BookingStatus.CANCELLED) {
            throw new errors_1.ValidationError('Cannot initiate payment for a cancelled booking');
        }
        const eligibleStatuses = [
            client_1.BookingStatus.HELD,
            client_1.BookingStatus.INITIATED,
            client_1.BookingStatus.PAYMENT_PENDING,
            client_1.BookingStatus.PAYMENT_FAILED,
        ];
        if (!eligibleStatuses.includes(booking.status)) {
            throw new errors_1.ValidationError(`Cannot initiate payment for booking in status ${booking.status}`);
        }
        // Verify seat hold validity and enforce cutoff threshold (redBus / AbhiBus practice)
        const latestHold = await prisma.seatHold.findFirst({
            where: { bookingId: booking.id },
            orderBy: { createdAt: 'desc' },
        });
        if (!latestHold || latestHold.status !== client_1.HoldStatus.ACTIVE) {
            throw new errors_1.ValidationError('An active seat hold is required');
        }
        {
            const now = Date.now();
            const expiresAt = new Date(latestHold.expiresAt).getTime();
            if (expiresAt < now) {
                throw new errors_1.ValidationError('Seat hold has expired. Please reselect your seats.');
            }
            const cutoffMs = (env_1.env.PAYMENT_HOLD_CUTOFF_SECONDS || 90) * 1000;
            if (expiresAt - now < cutoffMs) {
                throw new errors_1.ValidationError(`Seat hold is expiring in less than ${env_1.env.PAYMENT_HOLD_CUTOFF_SECONDS || 90} seconds. Please reselect your seats to ensure successful confirmation.`);
            }
        }
        const amount = Number(booking.totalFare);
        // Idempotency: return existing PENDING payment if matching gateway and not expired (< 14 mins)
        const existingPayment = await prisma.payment.findFirst({
            where: { bookingId: booking.id, status: client_1.PaymentStatus.PENDING },
            orderBy: { createdAt: 'desc' },
        });
        const isExistingExpired = existingPayment &&
            Date.now() - new Date(existingPayment.createdAt).getTime() > 14 * 60 * 1000;
        if (existingPayment &&
            !isExistingExpired &&
            existingPayment.gateway === 'RAZORPAY') {
            const meta = existingPayment.metadata || {};
            return {
                paymentId: existingPayment.id,
                merchantTxnId: existingPayment.merchantTxnId,
                amount,
                currency: 'INR',
                gateway: existingPayment.gateway,
                paymentUrl: meta.paymentUrl ||
                    `/api/v1/payments/checkout/${existingPayment.merchantTxnId}`,
                upiIntentUrl: meta.upiIntentUrl,
                gatewayOrderId: existingPayment.gatewayOrderId,
                sdkPayload: meta.sdkPayload,
            };
        }
        // If an existing pending payment has expired, mark it FAILED to allow fresh order generation
        if (existingPayment && isExistingExpired) {
            await prisma.payment.update({
                where: { id: existingPayment.id },
                data: { status: client_1.PaymentStatus.FAILED },
            });
        }
        // Create the Razorpay order
        const orchestrator = payments_1.PaymentOrchestrator.getInstance();
        const intentResult = await orchestrator.createPaymentIntent({
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            amount,
            currency: 'INR',
            customerName: booking.contactName,
            customerEmail: booking.contactEmail,
            customerPhone: booking.contactPhone,
            paymentMode: input.paymentMode,
            redirectUrl: input.redirectUrl,
        }, input.gateway);
        const payment = await prisma.$transaction(async (tx) => {
            const changed = await tx.booking.updateMany({
                where: { id: booking.id, status: { in: eligibleStatuses } },
                data: { status: client_1.BookingStatus.PAYMENT_PENDING },
            });
            if (!changed.count)
                throw new errors_1.ConflictError('Booking state changed during payment initiation');
            return tx.payment.create({
                data: {
                    bookingId: booking.id,
                    userId: userId ?? booking.userId ?? null,
                    amount,
                    currency: 'INR',
                    status: client_1.PaymentStatus.PENDING,
                    gateway: intentResult.gateway,
                    paymentMethod: input.paymentMode,
                    merchantTxnId: intentResult.merchantTxnId,
                    gatewayOrderId: intentResult.gatewayOrderId,
                    metadata: {
                        paymentUrl: intentResult.paymentUrl,
                        upiIntentUrl: intentResult.upiIntentUrl,
                        sdkPayload: intentResult.sdkPayload,
                    },
                },
            });
        });
        paymentLogger.info({
            bookingId: booking.id,
            paymentId: payment.id,
            gateway: intentResult.gateway,
            merchantTxnId: intentResult.merchantTxnId,
            amount,
        }, 'Payment intent created successfully via orchestrator');
        return {
            paymentId: payment.id,
            merchantTxnId: intentResult.merchantTxnId,
            amount,
            currency: 'INR',
            gateway: intentResult.gateway,
            paymentUrl: intentResult.paymentUrl,
            upiIntentUrl: intentResult.upiIntentUrl,
            gatewayOrderId: intentResult.gatewayOrderId,
            sdkPayload: intentResult.sdkPayload,
        };
    }
    async verifyPayment(input, userId, fromWebhook = false) {
        const prisma = (0, database_1.getPrismaClient)();
        const payment = await prisma.payment.findUnique({
            where: { merchantTxnId: input.merchantTxnId },
            include: { booking: true },
        });
        if (!payment || payment.bookingId !== input.bookingId || payment.gateway !== 'RAZORPAY') {
            throw new errors_1.NotFoundError('Payment transaction not found');
        }
        const orchestrator = payments_1.PaymentOrchestrator.getInstance();
        const verifyCapture = () => orchestrator.verifyPayment('RAZORPAY', {
            merchantTxnId: payment.merchantTxnId,
            gatewayOrderId: payment.gatewayOrderId ?? undefined,
            gatewayPaymentId: input.gatewayPaymentId,
            gatewaySignature: input.gatewaySignature,
        });
        let gatewayVerification;
        if (!fromWebhook && (!userId || payment.booking.userId !== userId)) {
            if (payment.booking.userId || !input.gatewaySignature) {
                throw new errors_1.NotFoundError('Payment transaction not found');
            }
            gatewayVerification = await verifyCapture();
            if (!gatewayVerification.success || gatewayVerification.amount !== Number(payment.amount)) {
                throw new errors_1.NotFoundError('Payment transaction not found');
            }
        }
        // Idempotency: if already SUCCESS and booking CONFIRMED, return immediately
        if (payment.status === client_1.PaymentStatus.SUCCESS) {
            paymentLogger.info({ paymentId: payment.id, bookingId: payment.bookingId }, 'Payment already verified (idempotent return)');
            let confirmedBooking = await prisma.booking.findUnique({
                where: { id: payment.bookingId },
                include: { seats: true, passengers: true, ticket: true },
            });
            // If webhook or another thread marked payment SUCCESS and is completing GDS booking, wait internally
            const maxWaitMs = 3500;
            const pollIntervalMs = 200;
            let waitedMs = 0;
            while (waitedMs < maxWaitMs &&
                confirmedBooking &&
                confirmedBooking.status !== client_1.BookingStatus.CONFIRMED &&
                confirmedBooking.status !== client_1.BookingStatus.BOOKING_FAILED &&
                confirmedBooking.status !== client_1.BookingStatus.BOOKING_UNKNOWN) {
                await new Promise((r) => setTimeout(r, pollIntervalMs));
                waitedMs += pollIntervalMs;
                confirmedBooking = await prisma.booking.findUnique({
                    where: { id: payment.bookingId },
                    include: { seats: true, passengers: true, ticket: true },
                });
            }
            const ticket = confirmedBooking?.status === client_1.BookingStatus.CONFIRMED
                ? await this.ticketsService.getTicketByBookingId(payment.bookingId)
                : null;
            return {
                status: confirmedBooking?.status === client_1.BookingStatus.CONFIRMED ? 'SUCCESS' : (confirmedBooking?.status || 'PENDING'),
                payment,
                booking: confirmedBooking || payment.booking,
                ticket: ticket || undefined,
            };
        }
        // Prevent double-processing: check current booking state
        const currentBooking = await prisma.booking.findUnique({
            where: { id: payment.bookingId },
            include: { seats: true, passengers: true, ticket: true },
        });
        if (!currentBooking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        if (currentBooking.status === client_1.BookingStatus.CONFIRMED ||
            currentBooking.status === client_1.BookingStatus.BOOKING_UNKNOWN ||
            currentBooking.status === client_1.BookingStatus.BOOKING_FAILED) {
            paymentLogger.info({ bookingId: currentBooking.id, status: currentBooking.status }, 'Booking already in post-payment state, returning current status');
            let returnStatus = 'PENDING';
            let ticket = null;
            if (currentBooking.status === client_1.BookingStatus.CONFIRMED) {
                returnStatus = 'SUCCESS';
                ticket = await this.ticketsService.getTicketByBookingId(payment.bookingId);
            }
            else if (currentBooking.status === client_1.BookingStatus.BOOKING_FAILED) {
                returnStatus = 'BOOKING_FAILED';
            }
            else if (currentBooking.status === client_1.BookingStatus.BOOKING_UNKNOWN) {
                returnStatus = 'BOOKING_UNKNOWN';
            }
            return {
                status: returnStatus,
                payment,
                booking: currentBooking,
                ticket: ticket || undefined,
                message: currentBooking.status === client_1.BookingStatus.BOOKING_FAILED
                    ? 'Seat confirmation failed with operator. A full refund has been initiated.'
                    : currentBooking.status === client_1.BookingStatus.BOOKING_UNKNOWN
                        ? 'Seat confirmation with operator is in progress.'
                        : undefined,
            };
        }
        // -----------------------------------------------------------------------
        // CRITICAL: Server-side payment verification via PaymentOrchestrator
        // -----------------------------------------------------------------------
        try {
            gatewayVerification ??= await verifyCapture();
        }
        catch {
            return { status: 'PENDING', payment, booking: currentBooking };
        }
        if (!gatewayVerification.success || gatewayVerification.amount !== Number(payment.amount)
            || !gatewayVerification.gatewayPaymentId) {
            return { status: 'PENDING', payment, booking: currentBooking };
        }
        const updatedPayment = await prisma.$transaction(async (tx) => {
            const claim = await tx.booking.updateMany({
                where: { id: payment.bookingId, status: { in: [client_1.BookingStatus.PAYMENT_PENDING, client_1.BookingStatus.PAYMENT_FAILED] } },
                data: { status: client_1.BookingStatus.PAYMENT_SUCCESS },
            });
            if (!claim.count)
                return null;
            return tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: client_1.PaymentStatus.SUCCESS,
                    gatewayPaymentId: gatewayVerification.gatewayPaymentId,
                    gatewaySignature: input.gatewaySignature,
                },
            });
        });
        if (!updatedPayment) {
            let latestBooking = await prisma.booking.findUnique({
                where: { id: payment.bookingId },
                include: { seats: true, passengers: true, ticket: true },
            });
            // Internal wait: give concurrent request up to 3500ms to complete GDS BookSeats
            const maxWaitMs = 3500;
            const pollIntervalMs = 200;
            let waitedMs = 0;
            while (waitedMs < maxWaitMs &&
                latestBooking &&
                latestBooking.status !== client_1.BookingStatus.CONFIRMED &&
                latestBooking.status !== client_1.BookingStatus.BOOKING_FAILED &&
                latestBooking.status !== client_1.BookingStatus.BOOKING_UNKNOWN) {
                await new Promise((r) => setTimeout(r, pollIntervalMs));
                waitedMs += pollIntervalMs;
                latestBooking = await prisma.booking.findUnique({
                    where: { id: payment.bookingId },
                    include: { seats: true, passengers: true, ticket: true },
                });
            }
            if (latestBooking && latestBooking.status === client_1.BookingStatus.CONFIRMED) {
                const ticket = await this.ticketsService.getTicketByBookingId(payment.bookingId);
                return {
                    status: 'SUCCESS',
                    payment,
                    booking: latestBooking,
                    ticket,
                };
            }
            if (latestBooking && latestBooking.status === client_1.BookingStatus.BOOKING_FAILED) {
                return {
                    status: 'BOOKING_FAILED',
                    payment,
                    booking: latestBooking,
                    message: 'Seat confirmation failed with operator. A full refund has been initiated.',
                };
            }
            paymentLogger.warn({ bookingId: payment.bookingId }, 'Booking still being processed by another request after internal wait');
            return {
                status: 'PENDING',
                payment,
                booking: latestBooking || currentBooking,
            };
        }
        paymentLogger.info({ bookingId: payment.bookingId, paymentId: payment.id }, 'Payment marked SUCCESS, calling GDS BookSeats');
        // Call GDS BookSeats — this may throw for BOOKING_UNKNOWN/BOOKING_FAILED
        try {
            const confirmedBooking = await this.bookingsService.confirmBooking(payment.bookingId);
            const ticket = await this.ticketsService.getTicketByBookingId(payment.bookingId);
            // Record coupon usage if a coupon was applied to this booking
            const couponMeta = confirmedBooking.dropoffSnapshot?.couponMetadata;
            if (couponMeta && couponMeta.id) {
                try {
                    await coupons_service_1.CouponsService.getInstance().recordCouponUsage(couponMeta.id, confirmedBooking.userId || payment.userId || '00000000-0000-0000-0000-000000000000', confirmedBooking.id, Number(couponMeta.discount || 0));
                }
                catch (cErr) {
                    paymentLogger.warn({ cErr: cErr.message }, 'Failed to record coupon usage asynchronously');
                }
            }
            return {
                status: 'SUCCESS',
                payment: updatedPayment,
                booking: confirmedBooking,
                ticket,
            };
        }
        catch (err) {
            const postBooking = await prisma.booking.findUnique({
                where: { id: payment.bookingId },
                include: { seats: true, passengers: true, ticket: true },
            });
            if (postBooking?.status === client_1.BookingStatus.BOOKING_FAILED) {
                paymentLogger.error({ bookingId: payment.bookingId, err: err.message }, 'Payment succeeded but booking failed with provider — auto-refund queued');
                return {
                    status: 'BOOKING_FAILED',
                    payment: updatedPayment,
                    booking: postBooking,
                    message: 'Payment was debited, but seat confirmation failed with the bus operator. A 100% full refund has been automatically initiated.',
                };
            }
            if (postBooking?.status === client_1.BookingStatus.BOOKING_UNKNOWN) {
                paymentLogger.warn({ bookingId: payment.bookingId, err: err.message }, 'Payment succeeded but provider timed out — reconciliation in progress');
                return {
                    status: 'BOOKING_UNKNOWN',
                    payment: updatedPayment,
                    booking: postBooking,
                    message: 'Payment confirmed. Ticket confirmation with the bus operator is in progress.',
                };
            }
            throw err;
        }
    }
    /**
     * Razorpay Webhook Ingestion & Processing
     * Verifies cryptographic HMAC SHA256 signature and processes captured/failed events
     */
    async handleRazorpayWebhook(rawBody, headers) {
        const prisma = (0, database_1.getPrismaClient)();
        const razorpayAdapter = payments_1.PaymentOrchestrator.getInstance().getAdapter('RAZORPAY');
        if (typeof rawBody !== 'string' || !razorpayAdapter.verifyWebhookSignature(rawBody, headers)) {
            throw new errors_1.AuthorizationError('Invalid Razorpay webhook signature');
        }
        const event = razorpayAdapter.parseWebhookPayload(rawBody);
        if (event.status !== 'SUCCESS' || !event.gatewayPaymentId || !event.gatewayOrderId) {
            return { status: 'IGNORED' };
        }
        const header = headers['x-razorpay-event-id'];
        const eventId = typeof header === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(header)
            ? header : event.eventId;
        await prisma.webhookEvent.createMany({
            data: [{
                    eventId, gateway: 'RAZORPAY', eventType: event.eventType, verified: true,
                    payload: { orderId: event.gatewayOrderId, paymentId: event.gatewayPaymentId },
                }],
            skipDuplicates: true,
        });
        const receipt = await prisma.webhookEvent.findUniqueOrThrow({ where: { eventId } });
        if (receipt.processed)
            return { status: 'OK' };
        const payment = await prisma.payment.findFirst({
            where: { gateway: 'RAZORPAY', gatewayOrderId: event.gatewayOrderId },
        });
        if (payment) {
            const result = await this.verifyPayment({
                bookingId: payment.bookingId,
                merchantTxnId: payment.merchantTxnId,
                gatewayPaymentId: event.gatewayPaymentId,
            }, undefined, true);
            if (result.status === 'PENDING')
                throw new Error('Captured payment reconciliation is pending');
        }
        else {
            const topup = await prisma.walletTopup.findFirst({
                where: { gateway: 'RAZORPAY', gatewayOrderId: event.gatewayOrderId },
            });
            if (!topup)
                throw new Error('Razorpay order is not recorded locally');
            await agents_service_1.AgentsService.getInstance().confirmTopup(topup.merchantTxnId, event.gatewayPaymentId, topup.agentId);
        }
        await prisma.webhookEvent.update({
            where: { id: receipt.id },
            data: { processed: true, processedAt: new Date() },
        });
        return { status: 'OK' };
    }
    /**
     * B2B Agent Wallet Debit Payment
     * Deducts net fare (grossFare - commissionAmt) from agent wallet with optimistic concurrency,
     * posts balanced double-entry ledger entries, and confirms booking.
     */
    async payWithWallet(bookingId, agentId, userId) {
        const prisma = (0, database_1.getPrismaClient)();
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                commissionSnapshot: true,
            },
        });
        if (!booking) {
            throw new errors_1.NotFoundError('Booking not found');
        }
        if (booking.agentId !== agentId) {
            throw new errors_1.AuthorizationError('Booking does not belong to this agent organization');
        }
        if (booking.status === client_1.BookingStatus.CONFIRMED) {
            return { success: true, booking, message: 'Booking is already confirmed' };
        }
        if (booking.status !== client_1.BookingStatus.HELD) {
            throw new errors_1.ValidationError(`Cannot pay for booking in status ${booking.status}`);
        }
        // Verify hold validity if hold exists
        const latestHold = await prisma.seatHold.findFirst({
            where: { bookingId: booking.id },
            orderBy: { createdAt: 'desc' },
        });
        if (!latestHold || latestHold.status !== client_1.HoldStatus.ACTIVE || latestHold.expiresAt.getTime() <= Date.now()) {
            throw new errors_1.ValidationError('Seat hold has expired. Please reselect your seats.');
        }
        // Fetch and validate agent wallet
        const wallet = await prisma.agentWallet.findUnique({
            where: { agentId },
        });
        if (!wallet) {
            throw new errors_1.NotFoundError('Agent wallet not found');
        }
        if (wallet.isFrozen) {
            throw new errors_1.AuthorizationError(`Agent wallet is frozen: ${wallet.frozenReason || 'Contact platform administration'}`);
        }
        const grossFare = Number(booking.totalFare);
        const commissionAmt = booking.commissionSnapshot ? Number(booking.commissionSnapshot.commissionAmt) : 0;
        const netFare = Math.max(0, grossFare - commissionAmt);
        const cashBal = Number(wallet.cashBalance);
        const creditLimit = Number(wallet.creditLimit);
        const creditUsed = Number(wallet.creditUsed);
        const availableCredit = Math.max(0, creditLimit - creditUsed);
        const totalAvailable = cashBal + availableCredit;
        if (totalAvailable < netFare) {
            throw new errors_1.ValidationError(`Insufficient funds. Required: ₹${netFare.toFixed(2)}, Available: ₹${totalAvailable.toFixed(2)} (Cash: ₹${cashBal.toFixed(2)}, Credit: ₹${availableCredit.toFixed(2)})`);
        }
        // Execute atomic wallet debit + double-entry ledger posting + payment creation
        const txResult = await prisma.$transaction(async (tx) => {
            const claim = await tx.booking.updateMany({
                where: { id: booking.id, status: client_1.BookingStatus.HELD },
                data: { status: client_1.BookingStatus.PAYMENT_SUCCESS, version: { increment: 1 } },
            });
            if (!claim.count)
                throw new errors_1.ConflictError('Booking has already been claimed for payment');
            let newCash = cashBal;
            let newCreditUsed = creditUsed;
            if (cashBal >= netFare) {
                newCash = cashBal - netFare;
            }
            else {
                const shortfall = netFare - cashBal;
                newCash = 0;
                newCreditUsed = creditUsed + shortfall;
            }
            // Optimistic locking update
            const updateResult = await tx.agentWallet.updateMany({
                where: { id: wallet.id, version: wallet.version, isFrozen: false },
                data: {
                    cashBalance: newCash,
                    creditUsed: newCreditUsed,
                    totalSpent: { increment: netFare },
                    totalCommission: { increment: commissionAmt },
                    version: { increment: 1 },
                },
            });
            if (updateResult.count === 0) {
                throw new errors_1.ConflictError('Concurrent wallet modification detected. Please try again.');
            }
            // Post double-entry balanced ledger batch
            const idempotencyPrefix = `BOOKING-${booking.id}`;
            const ledgerLines = (0, ledger_1.buildBookingPaymentLines)({
                bookingId: booking.id,
                agentId,
                netFare,
                commissionAmt,
                grossFare,
                idempotencyPrefix,
            });
            const ledgerData = (0, ledger_1.buildLedgerPostingData)({
                agentId,
                bookingId: booking.id,
                referenceId: booking.bookingNumber,
                createdBy: userId || 'AGENT',
                lines: ledgerLines,
            });
            await tx.ledgerEntry.createMany({ data: ledgerData, skipDuplicates: true });
            // Create Payment record
            const merchantTxnId = `WALLET-${booking.bookingNumber}-${Date.now()}`;
            const payment = await tx.payment.create({
                data: {
                    bookingId: booking.id,
                    userId: userId ?? booking.userId ?? null,
                    merchantTxnId,
                    amount: netFare,
                    status: client_1.PaymentStatus.SUCCESS,
                    gateway: 'WALLET',
                    paymentMethod: 'WALLET',
                    metadata: { cashDebited: cashBal - newCash, creditDebited: newCreditUsed - creditUsed },
                },
            });
            return { payment, netFare, commissionAmt };
        });
        paymentLogger.info({ bookingId: booking.id, agentId, netFare: txResult.netFare }, 'Agent wallet debited and ledger posted — confirming booking');
        // Confirm booking with upstream provider
        const confirmedBooking = await this.bookingsService.confirmBooking(booking.id);
        return {
            success: true,
            booking: confirmedBooking,
            payment: txResult.payment,
            netFarePaid: txResult.netFare,
            commissionEarned: txResult.commissionAmt,
        };
    }
    /**
     * Generates a mobile-responsive, secure Razorpay Checkout HTML page
     * Used by mobile apps and web checkouts to render the official Razorpay payment sheet
     */
    async generateCheckoutHtml(merchantTxnId, customRedirectUrl) {
        const prisma = (0, database_1.getPrismaClient)();
        const payment = await prisma.payment.findUnique({
            where: { merchantTxnId },
            include: { booking: true },
        });
        const redirectBase = customRedirectUrl && /^(?:aibus|exp):\/\/[a-zA-Z0-9./:_?=%+&-]+$/.test(customRedirectUrl)
            ? customRedirectUrl : 'aibus://payment-result';
        const sep = redirectBase.includes('?') ? '&' : '?';
        if (!payment || payment.gateway !== 'RAZORPAY') {
            throw new errors_1.NotFoundError('Razorpay payment not found');
        }
        if (payment.status === client_1.PaymentStatus.SUCCESS) {
            return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>AiBus Payment Confirmed</title>
<style>body{background:#051634;color:#fff;font-family:-apple-system,sans-serif;text-align:center;padding:40px;}</style>
</head>
<body>
  <h2 style="color:#10B981;">Payment Already Confirmed</h2>
  <p>Booking #${payment.booking.bookingNumber} is confirmed.</p>
  <script>setTimeout(function(){ window.location.href = "${redirectBase}${sep}status=SUCCESS&merchantTxnId=${merchantTxnId}&bookingId=${payment.bookingId}"; }, 1000);</script>
  <a href="${redirectBase}${sep}status=SUCCESS&merchantTxnId=${merchantTxnId}&bookingId=${payment.bookingId}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#013C9A;color:#fff;text-decoration:none;border-radius:8px;">View Confirmed Ticket</a>
</body>
</html>`;
        }
        const meta = payment.metadata || {};
        const sdkPayload = meta.sdkPayload || {
            key: env_1.env.RAZORPAY_KEY_ID,
            amount: Math.round(Number(payment.amount) * 100),
            currency: payment.currency || 'INR',
            name: env_1.env.APP_NAME || 'AiBus',
            description: `Bus Booking #${payment.booking.bookingNumber}`,
            order_id: payment.gatewayOrderId,
            prefill: {
                name: payment.booking.contactName || '',
                email: payment.booking.contactEmail || '',
                contact: payment.booking.contactPhone || '',
            },
            theme: { color: '#013C9A' },
        };
        const { prefill: _prefill, ...publicSdkPayload } = sdkPayload;
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>AiBus Secure Checkout</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #051634;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 32px 24px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    .brand { font-size: 24px; font-weight: 800; color: #FFFFFF; margin-bottom: 4px; letter-spacing: -0.5px; }
    .brand span { color: #E11D48; }
    .subtitle { font-size: 13px; color: #94A3B8; margin-bottom: 24px; }
    .amount-badge {
      background: #013C9A;
      color: #FFFFFF;
      font-size: 22px;
      font-weight: 700;
      padding: 10px 20px;
      border-radius: 30px;
      display: inline-block;
      margin-bottom: 24px;
    }
    .spinner {
      border: 3px solid rgba(255, 255, 255, 0.15);
      border-top: 3px solid #E11D48;
      border-radius: 50%;
      width: 44px;
      height: 44px;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .status-text { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
    .subtext { font-size: 12px; color: #94A3B8; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      background: #E11D48;
      color: #FFFFFF;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      width: 100%;
    }
    .btn-secondary {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #CBD5E1;
      margin-top: 10px;
    }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="card">
    <div class="brand">Ai<span>Bus</span></div>
    <div class="subtitle">Official Real-Time Ticket Booking</div>
    <div class="amount-badge">₹${Number(payment.amount).toFixed(2)}</div>
    <div class="spinner" id="spinner"></div>
    <div class="status-text" id="status-text">Opening Razorpay Payment Sheet...</div>
    <div class="subtext" id="sub-text">Please authorize your payment using UPI, Cards, or NetBanking.</div>
    <button class="btn" id="pay-btn" onclick="openRazorpay()" style="display:none;">Launch Payment</button>
    <button class="btn btn-secondary" onclick="cancelPayment()">Cancel & Return to App</button>
  </div>

  <script>
    var options = ${JSON.stringify(publicSdkPayload).replace(/</g, '\\u003c')};
    var redirectBase = "${redirectBase}";
    var sep = redirectBase.indexOf('?') >= 0 ? '&' : '?';
    var bookingId = "${payment.bookingId}";
    var merchantTxnId = "${merchantTxnId}";

    options.handler = function(response) {
      document.getElementById('spinner').style.display = 'block';
      document.getElementById('status-text').innerText = 'Payment received! Redirecting...';
      var targetUrl = redirectBase + sep + "status=SUCCESS" +
        "&merchantTxnId=" + encodeURIComponent(merchantTxnId) +
        "&bookingId=" + encodeURIComponent(bookingId) +
        "&gatewayOrderId=" + encodeURIComponent(response.razorpay_order_id || '') +
        "&gatewayPaymentId=" + encodeURIComponent(response.razorpay_payment_id || '') +
        "&gatewaySignature=" + encodeURIComponent(response.razorpay_signature || '');
      window.location.href = targetUrl;
    };

    options.modal = {
      ondismiss: function() {
        document.getElementById('spinner').style.display = 'none';
        document.getElementById('pay-btn').style.display = 'block';
        document.getElementById('status-text').innerText = 'Payment cancelled';
        document.getElementById('sub-text').innerText = 'You can retry or return to select another method.';
        var cancelUrl = redirectBase + sep + "status=CANCELLED" +
          "&merchantTxnId=" + encodeURIComponent(merchantTxnId) +
          "&bookingId=" + encodeURIComponent(bookingId);
        window.location.href = cancelUrl;
      }
    };

    var rzp = null;
    function openRazorpay() {
      try {
        if (!rzp) {
          rzp = new Razorpay(options);
          rzp.on('payment.failed', function(resp) {
            var failUrl = redirectBase + sep + "status=FAILED" +
              "&merchantTxnId=" + encodeURIComponent(merchantTxnId) +
              "&bookingId=" + encodeURIComponent(bookingId) +
              "&reason=" + encodeURIComponent(resp.error && resp.error.description ? resp.error.description : 'Payment failed');
            window.location.href = failUrl;
          });
        }
        rzp.open();
      } catch (err) {
        document.getElementById('pay-btn').style.display = 'block';
        document.getElementById('status-text').innerText = 'Unable to open payment modal';
        document.getElementById('sub-text').innerText = err.message || 'Please tap Launch Payment to retry.';
      }
    }

    function cancelPayment() {
      window.location.href = redirectBase + sep + "status=CANCELLED&merchantTxnId=" + encodeURIComponent(merchantTxnId) + "&bookingId=" + encodeURIComponent(bookingId);
    }

    // Auto-launch on load
    window.addEventListener('load', function() {
      setTimeout(openRazorpay, 300);
    });
  </script>
</body>
</html>`;
    }
}
exports.PaymentsService = PaymentsService;
//# sourceMappingURL=payments.service.js.map