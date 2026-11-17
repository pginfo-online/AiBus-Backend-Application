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


describe('Razorpay lost callback recovery', () => {
 it('discovers a captured payment from the server-owned order when the SDK response was lost', async () => {
  const get = vi.fn().mockResolvedValueOnce({data:{items:[{id:'pay_recovered',status:'captured'}]}}).mockResolvedValueOnce({data:{id:'pay_recovered',order_id:'order_owned',amount:10000,currency:'INR',status:'captured',method:'upi'}});
  (adapter as unknown as {client:unknown}).client={get};
  const result=await adapter.verifyPayment({merchantTxnId:'transaction',gatewayOrderId:'order_owned'});
  expect(result.success).toBe(true);expect(result.amount).toBe(100);expect(get.mock.calls[0][0]).toBe('/orders/order_owned/payments');
 });
 it('never accepts a captured payment attached to a different order', async () => {
  const get=vi.fn().mockResolvedValue({data:{id:'pay_recovered',order_id:'order_foreign',amount:10000,currency:'INR',status:'captured'}});
  (adapter as unknown as {client:unknown}).client={get};
  expect((await adapter.verifyPayment({merchantTxnId:'transaction',gatewayOrderId:'order_owned',gatewayPaymentId:'pay_recovered'})).success).toBe(false);
 });
});
