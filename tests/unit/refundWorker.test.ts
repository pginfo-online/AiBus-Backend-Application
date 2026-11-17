import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ refund: {} as any, completed: 100 }));
const gateway = vi.hoisted(() => ({ processRefund: vi.fn() }));
const db = vi.hoisted(() => {
  const mock: any = {
    $queryRaw: vi.fn(async () => []),
    refund: {
      findUnique: vi.fn(async () => state.refund),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async ({ data }: any) => Object.assign(state.refund, data)),
      aggregate: vi.fn(async () => ({ _sum: { amount: state.completed } })),
      count: vi.fn(async () => 0),
    },
    payment: { update: vi.fn(async () => ({})) },
    booking: { updateMany: vi.fn(async ({ where, data }: any) => { if (where.status.in.includes(state.refund.booking.status)) Object.assign(state.refund.booking, data); return { count: 1 }; }) },
  };
  mock.$transaction = (callback: any) => callback(mock);
  return mock;
});
vi.mock('../../src/infrastructure/database', () => ({ getPrismaClient: () => db }));
vi.mock('../../src/infrastructure/payments', () => ({ PaymentOrchestrator: { getInstance: () => gateway } }));
vi.mock('../../src/infrastructure/queues', () => ({ createWorker: vi.fn(), addJob: vi.fn() }));
let processRefund: typeof import('../../src/jobs/index').processRefund;
beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test'); vi.stubEnv('JWT_ACCESS_SECRET', 'a'.repeat(32)); vi.stubEnv('JWT_REFRESH_SECRET', 'b'.repeat(32)); vi.stubEnv('GDS_CLIENT_ID', '1'); vi.stubEnv('GDS_CLIENT_SECRET', 'local-test');
  processRefund = (await import('../../src/jobs/index')).processRefund;
});
beforeEach(() => {
  vi.clearAllMocks(); state.completed = 100;
  state.refund = { id: 'refund', bookingId: 'booking', paymentId: 'payment', amount: 40, status: 'PENDING', updatedAt: new Date(0), booking: { status: 'CONFIRMED' }, payment: { id: 'payment', amount: 100, gateway: 'RAZORPAY', gatewayPaymentId: 'pay_test', merchantTxnId: 'merchant' } };
  gateway.processRefund.mockResolvedValue({ success: true, gateway: 'RAZORPAY', gatewayRefundId: 'rfnd_test' });
});
describe('refund settlement worker', () => {
  it('uses cumulative refunds and retains a partially cancelled confirmed booking', async () => {
    await processRefund({ refundId: 'refund' });
    expect(db.payment.update).toHaveBeenCalledWith({ where: { id: 'payment' }, data: { status: 'REFUNDED' } });
    expect(state.refund.booking.status).toBe('CONFIRMED');
  });
  it('leaves the payment partially refunded while money remains collected', async () => {
    state.completed = 70;
    await processRefund({ refundId: 'refund' });
    expect(db.payment.update).toHaveBeenCalledWith({ where: { id: 'payment' }, data: { status: 'PARTIALLY_REFUNDED' } });
  });
  it('does not issue a second refund for a recently claimed operation', async () => {
    state.refund.status = 'PROCESSING'; state.refund.updatedAt = new Date();
    await processRefund({ refundId: 'refund' });
    expect(gateway.processRefund).not.toHaveBeenCalled();
  });
});
