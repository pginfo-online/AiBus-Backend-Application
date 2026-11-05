import { createHmac } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const secret = 'local-webhook-regression-test-secret';
let adapter: import('../../src/infrastructure/payments/adapters/RazorpayAdapter').RazorpayAdapter;

beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('DATABASE_URL', 'postgresql://localhost/aibus_test');
  vi.stubEnv('JWT_ACCESS_SECRET', 'a'.repeat(32));
  vi.stubEnv('JWT_REFRESH_SECRET', 'b'.repeat(32));
  vi.stubEnv('GDS_CLIENT_ID', '1');
  vi.stubEnv('GDS_CLIENT_SECRET', 'unused-by-these-tests');
  vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_local');
  vi.stubEnv('RAZORPAY_KEY_SECRET', 'local-checkout-regression-test-secret');
  vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', secret);
  const { RazorpayAdapter } = await import('../../src/infrastructure/payments/adapters/RazorpayAdapter');
  adapter = new RazorpayAdapter();
});

describe('Razorpay payment security boundaries', () => {
  it('requires a webhook signature even in test mode', () => {
    expect(adapter.verifyWebhookSignature('{}', {})).toBe(false);
  });

  it('verifies the original webhook body byte sequence', () => {
    const body = '{"event": "payment.captured"}';
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    const headers = { 'x-razorpay-signature': signature };
    expect(adapter.verifyWebhookSignature(body, headers)).toBe(true);
    expect(adapter.verifyWebhookSignature('{"event":"payment.captured"}', headers)).toBe(false);
  });

  it('rejects the former client-side verification bypass without fetching a payment', async () => {
    const result = await adapter.verifyPayment({
      merchantTxnId: 'local-transaction',
      gatewayOrderId: 'order_local',
      gatewayPaymentId: 'pay_local',
      gatewaySignature: 'VERIFIED_VIA_WEBHOOK',
    });
    expect(result.success).toBe(false);
  });
});
