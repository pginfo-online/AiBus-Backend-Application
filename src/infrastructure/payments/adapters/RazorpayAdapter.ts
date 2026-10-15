import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env, isDevelopment, isTest } from '../../../config/env';
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
  private client: Razorpay | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (keyId && keySecret) {
      this.client = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      razorpayLogger.info({ keyId: keyId.substring(0, 8) + '...' }, 'Razorpay client initialized with live/test credentials');
    } else {
      razorpayLogger.warn('Razorpay credentials not fully configured in env; operating in simulation/mock mode');
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
    const keyId = env.RAZORPAY_KEY_ID || 'rzp_test_mock';
    const keySecret = env.RAZORPAY_KEY_SECRET || 'mock_secret';
    const merchantTxnId = params.merchantTxnId || `RZP-${params.bookingNumber || 'BKG'}-${Date.now()}`;

    let orderId: string;

    if (this.client && this.isConfigured()) {
      try {
        const order = await this.client.orders.create({
          amount: amountInPaise,
          currency: params.currency || 'INR',
          receipt: merchantTxnId,
          notes: {
            bookingId: params.bookingId,
            bookingNumber: params.bookingNumber,
            customerEmail: params.customerEmail || '',
            customerPhone: params.customerPhone || '',
            isTopup: params.isTopup ? 'true' : 'false',
            ...(params.notes || {}),
          },
        });
        orderId = order.id;
      } catch (err: any) {
        razorpayLogger.error({ err: err.message, bookingId: params.bookingId }, 'Razorpay order creation failed');
        throw new Error(`Razorpay order creation failed: ${err.message}`);
      }
    } else {
      // Development or test fallback
      orderId = `order_sim_${Date.now()}`;
      razorpayLogger.info({ orderId, merchantTxnId }, 'Simulated Razorpay order created for dev/test');
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
        color: '#E11D48', // Primary brand color
      },
      // Native UPI intent configuration (Android & iOS direct deep-link triggers)
      upi: {
        flow: 'intent',
      },
    };

    // Construct universal payment URL (Razorpay Hosted Checkout / redirect)
    const baseRedirect = params.redirectUrl || env.PHONEPE_REDIRECT_URL || 'http://localhost:5173/payment-result';
    const paymentUrl = `${baseRedirect}${baseRedirect.includes('?') ? '&' : '?'}gateway=RAZORPAY&orderId=${orderId}&merchantTxnId=${merchantTxnId}`;

    // Standard NPCI UPI Intent URI format
    const upiIntentUrl = `upi://pay?pa=aibus@razorpay&pn=AiBus&tr=${merchantTxnId}&am=${params.amount.toFixed(2)}&cu=INR&tn=Booking_${params.bookingNumber}`;

    return {
      gateway: 'RAZORPAY',
      merchantTxnId,
      gatewayOrderId: orderId,
      amount: params.amount,
      currency: params.currency || 'INR',
      paymentUrl,
      upiIntentUrl,
      sdkPayload,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    };
  }

  /**
   * Verify Razorpay Payment
   * Supports both cryptographic HMAC SHA256 signature verification and API fetch
   */
  public async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult> {
    const keySecret = env.RAZORPAY_KEY_SECRET || 'mock_secret';
    const { gatewayOrderId, gatewayPaymentId, gatewaySignature, merchantTxnId } = params;

    // 1. Signature Verification if client returned orderId, paymentId, signature
    if (gatewayOrderId && gatewayPaymentId && gatewaySignature) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${gatewayOrderId}|${gatewayPaymentId}`)
        .digest('hex');

      const isSignatureValid =
        generatedSignature === gatewaySignature ||
        ((isDevelopment || isTest) && gatewaySignature.startsWith('mock_sig'));

      if (isSignatureValid) {
        razorpayLogger.info(
          { merchantTxnId, gatewayPaymentId },
          'Razorpay payment verified successfully via cryptographic HMAC signature'
        );
        return {
          gateway: 'RAZORPAY',
          success: true,
          status: 'SUCCESS',
          merchantTxnId,
          gatewayOrderId,
          gatewayPaymentId,
        };
      } else {
        razorpayLogger.warn(
          { merchantTxnId, gatewayOrderId, gatewayPaymentId },
          'Razorpay payment signature mismatch'
        );
        return {
          gateway: 'RAZORPAY',
          success: false,
          status: 'FAILED',
          merchantTxnId,
          gatewayOrderId,
          gatewayPaymentId,
          failureReason: 'Cryptographic signature mismatch',
        };
      }
    }

    // 2. Direct API status check if paymentId is available
    if (this.client && this.isConfigured() && gatewayPaymentId) {
      try {
        const payment = await this.client.payments.fetch(gatewayPaymentId);
        const isCaptured = payment.status === 'captured';

        return {
          gateway: 'RAZORPAY',
          success: isCaptured,
          status: isCaptured ? 'SUCCESS' : payment.status === 'failed' ? 'FAILED' : 'PENDING',
          merchantTxnId,
          gatewayOrderId: payment.order_id || gatewayOrderId,
          gatewayPaymentId: payment.id,
          amount: Number(payment.amount) / 100,
          paymentMethod: payment.method,
          bankTransactionId: payment.acquirer_data?.bank_transaction_id || payment.acquirer_data?.rrn,
          failureReason: payment.error_description || undefined,
        };
      } catch (err: any) {
        razorpayLogger.warn({ err: err.message, gatewayPaymentId }, 'Failed to fetch Razorpay payment via API');
        if (isDevelopment || isTest) {
          return {
            gateway: 'RAZORPAY',
            success: false,
            status: 'PENDING',
            merchantTxnId,
          };
        }
        throw err;
      }
    }

    // In dev/test fallback
    if (isDevelopment || isTest) {
      return {
        gateway: 'RAZORPAY',
        success: true,
        status: 'SUCCESS',
        merchantTxnId,
        gatewayOrderId: gatewayOrderId || `order_sim_${Date.now()}`,
        gatewayPaymentId: gatewayPaymentId || `pay_sim_${Date.now()}`,
      };
    }

    return {
      gateway: 'RAZORPAY',
      success: false,
      status: 'PENDING',
      merchantTxnId,
      failureReason: 'Insufficient parameters for verification',
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
        const refund = await this.client.payments.refund(params.gatewayPaymentId, {
          amount: amountInPaise,
          receipt: params.merchantRefundId,
          notes: {
            reason: params.reason || 'Ticket cancellation refund',
            merchantRefundId: params.merchantRefundId,
          },
        });

        razorpayLogger.info(
          { refundId: refund.id, amount: params.amount, paymentId: params.gatewayPaymentId },
          'Razorpay refund executed successfully'
        );

        return {
          gateway: 'RAZORPAY',
          success: true,
          gatewayRefundId: refund.id,
          code: 'REFUND_SUCCESS',
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

    // Simulation for dev/test
    const mockRefundId = `rfnd_sim_${Date.now()}`;
    razorpayLogger.info({ mockRefundId, amount: params.amount }, 'Simulated Razorpay refund completed');
    return {
      gateway: 'RAZORPAY',
      success: true,
      gatewayRefundId: mockRefundId,
      code: 'REFUND_SUCCESS',
      message: 'Simulated refund processed',
    };
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
      if (isDevelopment || isTest) return true;
      return false;
    }

    const secret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      razorpayLogger.warn('No Razorpay webhook secret configured; rejecting signature in production');
      return isDevelopment || isTest;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  }

  /**
   * Parse Razorpay Webhook Payload into unified structure
   */
  public parseWebhookPayload(rawBody: string): WebhookEventNormalized {
    const payload = JSON.parse(rawBody);
    const event = payload.event as string;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    const eventId = payload.account_id ? `${payload.account_id}_${Date.now()}` : `rzp_evt_${Date.now()}`;
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
