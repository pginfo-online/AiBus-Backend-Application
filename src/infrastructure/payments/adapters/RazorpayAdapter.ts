import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { env } from '../../../config/env';
import { logger } from '../../logger';
import {
  IPaymentGateway,
  GatewayName,
  PaymentIntentParams,
  PaymentIntentResult,
  VerifyPaymentParams,
  PaymentVerificationResult,
  ProcessRefundParams,
  RefundResult,
  WebhookEventNormalized,
} from '../IPaymentGateway';

const razorpayLogger = logger.child({ module: 'razorpay-adapter' });

export class RazorpayAdapter implements IPaymentGateway {
  public readonly gatewayName: GatewayName = 'RAZORPAY';
  private client: AxiosInstance | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret) {
      this.client = axios.create({
        baseURL: 'https://api.razorpay.com/v1',
        auth: { username: keyId, password: keySecret },
        maxRedirects: 0,
        timeout: 10_000,
      });
      razorpayLogger.info({ keyId: keyId.substring(0, 8) + '...' }, 'Razorpay client initialized with live/test credentials');
    } else {
      razorpayLogger.warn('Razorpay credentials not fully configured in env; Razorpay operations are unavailable');
    }
  }

  public isConfigured(): boolean {
    return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  }

  /**
   * Create Razorpay Order
   * Generates order ID and prepares native SDK payload for Web & Mobile UPI Intent
   */
  public async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
    const amountInPaise = Math.round(params.amount * 100);
    if (!Number.isSafeInteger(amountInPaise) || amountInPaise < 100) {
      throw new Error('Razorpay order amount must be at least INR 1');
    }
    const keyId = env.RAZORPAY_KEY_ID;
    const merchantTxnId = params.merchantTxnId || crypto.randomUUID();

    let orderId: string;

    if (this.client && this.isConfigured()) {
      try {
        const { data: order } = await this.client.post<{ id: string }>('/orders', {
          amount: amountInPaise,
          currency: params.currency || 'INR',
          receipt: merchantTxnId,
          notes: {
            bookingId: params.bookingId,
            bookingNumber: params.bookingNumber,
            merchantTxnId,
            isTopup: params.isTopup ? 'true' : 'false',
            ...(params.notes || {}),
          },
        });
        if (!order.id?.startsWith('order_')) throw new Error('Invalid Razorpay order response');
        orderId = order.id;
      } catch (err: any) {
        razorpayLogger.error({ err: err.message, bookingId: params.bookingId }, 'Razorpay order creation failed');
        throw new Error(`Razorpay order creation failed: ${err.message}`);
      }
    } else {
      throw new Error('Razorpay credentials are required');
    }

    // Prepare client-side payload for Web checkout & Mobile native UPI Intent
    const sdkPayload: Record<string, unknown> = {
      key: keyId,
      amount: amountInPaise,
      currency: params.currency || 'INR',
      name: env.APP_NAME || 'AiBus',
      description: `Bus Booking #${params.bookingNumber}`,
      order_id: orderId,
      prefill: {
        name: params.customerName || '',
        email: params.customerEmail || '',
        contact: params.customerPhone || '',
      },
      notes: {
        bookingId: params.bookingId,
        bookingNumber: params.bookingNumber,
        merchantTxnId,
      },
      theme: {
        color: '#013C9A', // Primary brand color
      },
      // Native UPI intent configuration (Android & iOS direct deep-link triggers)
      upi: {
        flow: 'intent',
      },
      modal: {
        confirm_close: true,
      },
    };

    // Construct universal payment URL (Razorpay Hosted Checkout / redirect)
    const baseRedirect = params.redirectUrl || `/api/v1/payments/checkout/${merchantTxnId}`;
    const paymentUrl = baseRedirect.includes('checkout')
      ? baseRedirect
      : `${baseRedirect}${baseRedirect.includes('?') ? '&' : '?'}gateway=RAZORPAY&orderId=${orderId}&merchantTxnId=${merchantTxnId}`;

    return {
      gateway: 'RAZORPAY',
      merchantTxnId,
      gatewayOrderId: orderId,
      amount: params.amount,
      currency: params.currency || 'INR',
      paymentUrl,
      sdkPayload,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    };
  }

  /**
   * Verify Razorpay Payment
   * Supports both cryptographic HMAC SHA256 signature verification and API fetch
   */
  public async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult> {
    const { gatewayOrderId, gatewayPaymentId, gatewaySignature, merchantTxnId } = params;
    const result = { gateway: this.gatewayName, merchantTxnId, success: false, status: 'PENDING' as const };
    const secret = env.RAZORPAY_KEY_SECRET;
    if (!this.client || !secret || !gatewayOrderId || !gatewayPaymentId) return result;

    if (gatewaySignature !== undefined) {
      const expected = crypto.createHmac('sha256', secret)
        .update(`${gatewayOrderId}|${gatewayPaymentId}`).digest();
      if (!/^[a-f0-9]{64}$/i.test(gatewaySignature)
        || !crypto.timingSafeEqual(expected, Buffer.from(gatewaySignature, 'hex'))) return result;
    }

    if (!/^pay_[a-zA-Z0-9]+$/.test(gatewayPaymentId)) return result;
    const { data: payment } = await this.client.get<{
      id: string; order_id: string; amount: number; currency: string; status: string; method: string;
      acquirer_data?: { bank_transaction_id?: string; rrn?: string };
    }>(`/payments/${gatewayPaymentId}`);
    if (payment.id !== gatewayPaymentId || payment.order_id !== gatewayOrderId || payment.currency !== 'INR'
      || !Number.isSafeInteger(Number(payment.amount)) || payment.status !== 'captured') return result;

    return {
      ...result, success: true, status: 'SUCCESS',
      gatewayOrderId, gatewayPaymentId: payment.id, amount: Number(payment.amount) / 100,
      paymentMethod: payment.method,
      bankTransactionId: payment.acquirer_data?.bank_transaction_id || payment.acquirer_data?.rrn,
    };
  }

  /**
   * Process Refund via Razorpay API
   */
  public async processRefund(params: ProcessRefundParams): Promise<RefundResult> {
    if (!params.gatewayPaymentId) {
      return {
        gateway: 'RAZORPAY',
        success: false,
        code: 'MISSING_PAYMENT_ID',
        message: 'No Razorpay payment ID provided for refund',
      };
    }

    const amountInPaise = Math.round(params.amount * 100);

    if (this.client && this.isConfigured()) {
      try {
        const path = `/payments/${encodeURIComponent(params.gatewayPaymentId)}/refund`;
        const { data: refund } = params.gatewayRefundId
          ? await this.client.get<{ id: string; status: string }>(`${path}s/${encodeURIComponent(params.gatewayRefundId)}`)
          : await this.client.post<{ id: string; status: string }>(path, {
              amount: amountInPaise,
              receipt: params.merchantRefundId,
              notes: { reason: params.reason || 'Ticket cancellation refund' },
            }, { headers: { 'X-Refund-Idempotency': params.merchantRefundId } });

        razorpayLogger.info(
          { refundId: refund.id, amount: params.amount, paymentId: params.gatewayPaymentId },
          'Razorpay refund executed successfully'
        );

        return {
          gateway: 'RAZORPAY',
          success: refund.status === 'processed',
          gatewayRefundId: refund.id,
          code: refund.status === 'processed' ? 'REFUND_SUCCESS' : refund.status === 'pending' ? 'REFUND_PENDING' : 'REFUND_FAILED',
          message: 'Refund successfully initiated via Razorpay',
        };
      } catch (err: any) {
        razorpayLogger.error(
          { err: err.message, paymentId: params.gatewayPaymentId },
          'Razorpay refund API call failed'
        );
        return {
          gateway: 'RAZORPAY',
          success: false,
          code: err.error?.code || 'REFUND_FAILED',
          message: err.error?.description || err.message,
        };
      }
    }

    return { gateway: 'RAZORPAY', success: false, code: 'NOT_CONFIGURED' };
  }

  /**
   * Webhook Signature Verification
   * Matches x-razorpay-signature header using HMAC SHA256
   */
  public verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): boolean {
    const signature = headers['x-razorpay-signature'];
    if (!signature || typeof signature !== 'string') {
      return false;
    }

    const secret = env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      razorpayLogger.warn('No Razorpay webhook secret configured; rejecting signature in production');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  }

  /**
   * Parse Razorpay Webhook Payload into unified structure
   */
  public parseWebhookPayload(rawBody: string): WebhookEventNormalized {
    const payload = JSON.parse(rawBody);
    const event = payload.event as string;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const eventId = crypto.createHash('sha256').update(rawBody).digest('hex');
    const gatewayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const gatewayPaymentId = paymentEntity?.id;
    const merchantTxnId =
      paymentEntity?.notes?.merchantTxnId ||
      orderEntity?.receipt ||
      `RZP-${gatewayOrderId || Date.now()}`;

    let status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IGNORED' = 'PENDING';

    if (event === 'payment.captured' || event === 'order.paid') {
      status = 'SUCCESS';
    } else if (event === 'payment.failed') {
      status = 'FAILED';
    } else {
      status = 'IGNORED';
    }

    return {
      gateway: 'RAZORPAY',
      eventId,
      eventType: event,
      merchantTxnId,
      gatewayOrderId,
      gatewayPaymentId,
      amount: paymentEntity?.amount ? Number(paymentEntity.amount) / 100 : undefined,
      status,
      rawPayload: payload,
    };
  }
}
