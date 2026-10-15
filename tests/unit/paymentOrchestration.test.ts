import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { RazorpayAdapter } from '../../src/infrastructure/payments/adapters/RazorpayAdapter';
import { PhonePeAdapter } from '../../src/infrastructure/payments/adapters/PhonePeAdapter';
import { PaymentOrchestrator } from '../../src/infrastructure/payments/PaymentOrchestrator';

describe('Payment Orchestration & Multi-Gateway Unit Tests', () => {
  describe('RazorpayAdapter', () => {
    let adapter: RazorpayAdapter;

    beforeEach(() => {
      adapter = new RazorpayAdapter();
    });

    it('should create payment intent with correct amounts, UPI intent URL and SDK payload', async () => {
      const intent = await adapter.createPaymentIntent({
        merchantTxnId: 'TXN-AIBUS-TEST-001',
        bookingNumber: 'AIB-1001',
        amount: 850.5,
        currency: 'INR',
        bookingId: 'test-booking-uuid',
        customerName: 'Rohan Sharma',
        customerEmail: 'rohan@example.com',
        customerPhone: '9876543210',
        notes: { test: 'true' },
      });

      expect(intent.gateway).toBe('RAZORPAY');
      expect(intent.merchantTxnId).toBe('TXN-AIBUS-TEST-001');
      expect(intent.amount).toBe(850.5);
      expect(intent.upiIntentUrl).toContain('upi://pay');
      expect(intent.upiIntentUrl).toContain('am=850.50');
      expect(intent.sdkPayload).toBeDefined();
      expect(intent.sdkPayload?.currency).toBe('INR');
      expect((intent.sdkPayload?.prefill as any).contact).toBe('9876543210');
      expect((intent.sdkPayload?.prefill as any).email).toBe('rohan@example.com');
      expect(intent.sdkPayload?.upi).toEqual({ flow: 'intent' });
    });

    it('should verify payment signature correctly via verifyPayment', async () => {
      const orderId = 'order_test_999';
      const paymentId = 'pay_test_888';
      const secret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';

      // Generate expected valid HMAC
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const successResult = await adapter.verifyPayment({
        merchantTxnId: 'TXN-001',
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        gatewaySignature: expectedSignature,
      });

      expect(successResult.success).toBe(true);
      expect(successResult.status).toBe('SUCCESS');
      expect(successResult.gateway).toBe('RAZORPAY');

      const failedResult = await adapter.verifyPayment({
        merchantTxnId: 'TXN-001',
        gatewayOrderId: orderId,
        gatewayPaymentId: paymentId,
        gatewaySignature: 'bad_tampered_signature_12345',
      });

      expect(failedResult.success).toBe(false);
      expect(failedResult.status).toBe('FAILED');
    });

    it('should parse webhook payloads into unified structures', () => {
      const eventPayload = {
        account_id: 'acc_test_123',
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_ABC123',
              order_id: 'order_XYZ456',
              amount: 125000,
              currency: 'INR',
              method: 'upi',
              notes: { merchantTxnId: 'TXN-AIBUS-001' },
            },
          },
        },
      };

      const normalized = adapter.parseWebhookPayload(JSON.stringify(eventPayload));
      expect(normalized.eventType).toBe('payment.captured');
      expect(normalized.gateway).toBe('RAZORPAY');
      expect(normalized.gatewayPaymentId).toBe('pay_ABC123');
      expect(normalized.gatewayOrderId).toBe('order_XYZ456');
      expect(normalized.amount).toBe(1250);
      expect(normalized.status).toBe('SUCCESS');
      expect(normalized.merchantTxnId).toBe('TXN-AIBUS-001');
    });
  });

  describe('PhonePeAdapter', () => {
    let adapter: PhonePeAdapter;

    beforeEach(() => {
      adapter = new PhonePeAdapter();
    });

    it('should create payment intent with valid redirect URL and UPI intent URL', async () => {
      const intent = await adapter.createPaymentIntent({
        merchantTxnId: 'TXN-PHONEPE-001',
        bookingNumber: 'AIB-2002',
        amount: 500,
        currency: 'INR',
        bookingId: 'booking-phonepe-uuid',
      });

      expect(intent.gateway).toBe('PHONEPE');
      expect(intent.merchantTxnId).toBe('TXN-PHONEPE-001');
      expect(intent.amount).toBe(500);
      expect(intent.paymentUrl).toBeDefined();
      expect(intent.upiIntentUrl).toContain('phonepe://pay');
    });
  });

  describe('PaymentOrchestrator', () => {
    let orchestrator: PaymentOrchestrator;

    beforeEach(() => {
      orchestrator = PaymentOrchestrator.getInstance();
    });

    it('should initialize and list registered gateways', async () => {
      const gateways = await orchestrator.listGateways();
      expect(gateways.length).toBeGreaterThanOrEqual(2);
      const gatewayNames = gateways.map((g) => g.gateway);
      expect(gatewayNames).toContain('RAZORPAY');
      expect(gatewayNames).toContain('PHONEPE');
    });

    it('should track gateway health and circuit breaker states', () => {
      expect(orchestrator.isGatewayHealthy('RAZORPAY')).toBe(true);
      expect(orchestrator.isGatewayHealthy('PHONEPE')).toBe(true);

      const metrics = orchestrator.getHealthMetrics();
      expect(metrics.RAZORPAY).toBeDefined();
      expect(metrics.PHONEPE).toBeDefined();
      expect(metrics.RAZORPAY.isCircuitOpen).toBe(false);
    });

    it('should trip circuit breaker after consecutive failures', () => {
      const gw = 'PHONEPE';
      // Record 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        orchestrator.recordFailure(gw);
      }

      const metrics = orchestrator.getHealthMetrics();
      expect(metrics.PHONEPE.consecutiveFailures).toBe(5);
      expect(orchestrator.isGatewayHealthy(gw)).toBe(false);

      // Record a success - circuit should reset to CLOSED
      orchestrator.recordSuccess(gw);
      expect(orchestrator.isGatewayHealthy(gw)).toBe(true);
      expect(orchestrator.getHealthMetrics().PHONEPE.consecutiveFailures).toBe(0);
    });

    it('should automatically fall back to secondary gateway when primary fails', async () => {
      // Spy on Razorpay adapter to simulate a primary gateway outage
      const razorpayAdapter = orchestrator.getAdapter('RAZORPAY');
      const createIntentSpy = vi.spyOn(razorpayAdapter, 'createPaymentIntent').mockRejectedValueOnce(
        new Error('503 Service Unavailable: Razorpay API network error')
      );

      const result = await orchestrator.createPaymentIntentWithFallback({
        merchantTxnId: 'TXN-FAILOVER-001',
        amount: 450,
        currency: 'INR',
        bookingId: 'test-booking-failover',
      });

      // Intent creation should have fallen back to PhonePe smoothly
      expect(result.gateway).toBe('PHONEPE');
      expect(result.amount).toBe(450);
      expect(createIntentSpy).toHaveBeenCalledTimes(1);

      createIntentSpy.mockRestore();
    });
  });
});
