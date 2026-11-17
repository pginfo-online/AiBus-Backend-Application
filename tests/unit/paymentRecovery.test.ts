import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ booking: {} as any, payment: {} as any, refunds: [] as any[] }));
const gateway = vi.hoisted(() => ({ verifyPayment: vi.fn() }));
const confirm = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => {
  const mock: any = {
    $queryRaw: vi.fn(async () => []),
    payment: {
      findUnique: vi.fn(async () => ({ ...state.payment, booking: state.booking })),
      findUniqueOrThrow: vi.fn(async () => ({ ...state.payment, booking: state.booking })),
      updateMany: vi.fn(async ({ data }: any) => { Object.assign(state.payment, data); return { count: 1 }; }),
      findFirst: vi.fn(async () => null),
    },
    booking: {
      findUniqueOrThrow: vi.fn(async () => state.booking),
      update: vi.fn(async ({ data }: any) => { Object.assign(state.booking, data); return state.booking; }),
      updateMany: vi.fn(async ({ data }: any) => { if (state.booking.status !== 'BOOKING_FAILED') Object.assign(state.booking, data); return { count: 1 }; }),
    },
    refund: { createMany: vi.fn(async ({ data }: any) => { state.refunds.push(...data); return { count: data.length }; }) },
  };
  mock.$transaction = (callback: any) => callback(mock);
  return mock;
});
vi.mock('../../src/infrastructure/database', () => ({ getPrismaClient: () => db }));
vi.mock('../../src/infrastructure/payments', () => ({ PaymentOrchestrator: { getInstance: () => gateway } }));
vi.mock('../../src/modules/bookings/bookings.service', () => ({ BookingsService: { getInstance: () => ({ confirmBooking: confirm }) } }));
vi.mock('../../src/modules/tickets/tickets.service', () => ({ TicketsService: { getInstance: () => ({}) } }));
vi.mock('../../src/infrastructure/queues', () => ({ addJob: vi.fn(async () => null) }));
let payments: import('../../src/modules/payments/payments.service').PaymentsService;
beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test'); vi.stubEnv('JWT_ACCESS_SECRET', 'a'.repeat(32)); vi.stubEnv('JWT_REFRESH_SECRET', 'b'.repeat(32)); vi.stubEnv('GDS_CLIENT_ID', '1'); vi.stubEnv('GDS_CLIENT_SECRET', 'local-test');
  payments = (await import('../../src/modules/payments/payments.service')).PaymentsService.getInstance();
});
beforeEach(() => {
  vi.clearAllMocks(); state.refunds = [];
  state.booking = { id: 'booking', userId: 'owner', status: 'PAYMENT_PENDING', providerHoldId: 'hold', seats: [], passengers: [], refunds: [] };
  state.payment = { id: 'payment', bookingId: 'booking', merchantTxnId: 'merchant', userId: 'owner', gateway: 'RAZORPAY', gatewayOrderId: 'order_test', amount: 100, status: 'PENDING' };
  gateway.verifyPayment.mockResolvedValue({ success: true, amount: 100, gatewayPaymentId: 'pay_test', status: 'SUCCESS' });
});
describe('capture recovery without synchronous operator work', () => {
  it('persists capture and responds pending even if the queue is unavailable', async () => {
    const result = await payments.verifyPayment({ bookingId: 'booking', merchantTxnId: 'merchant' }, 'owner');
    expect(result.payment.status).toBe('SUCCESS'); expect(result.booking.status).toBe('PAYMENT_SUCCESS'); expect(result.status).toBe('PENDING');
    expect(confirm).not.toHaveBeenCalled(); expect(gateway.verifyPayment.mock.calls[0][1].gatewayPaymentId).toBeUndefined();
  });
  it('does not infer capture from SDK claims or mismatching gateway amounts', async () => {
    gateway.verifyPayment.mockResolvedValue({ success: true, amount: 1, gatewayPaymentId: 'pay_wrong', status: 'SUCCESS' });
    const result = await payments.verifyPayment({ bookingId: 'booking', merchantTxnId: 'merchant', gatewayPaymentId: 'pay_claimed' }, 'owner');
    expect(result.status).toBe('PENDING'); expect(state.payment.status).toBe('PENDING');
  });
  it('returns confirmed state immediately on replay without an operator call', async () => {
    state.payment.status = 'SUCCESS'; state.booking.status = 'CONFIRMED';
    expect((await payments.verifyPayment({ bookingId: 'booking', merchantTxnId: 'merchant' }, 'owner')).status).toBe('SUCCESS');
    expect(gateway.verifyPayment).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled();
  });
  it('refunds a late capture after the checkout reservation was released', async () => {
    state.booking.status = 'HOLD_EXPIRED';
    const result = await payments.verifyPayment({ bookingId: 'booking', merchantTxnId: 'merchant' }, 'owner');
    expect(result.status).toBe('BOOKING_FAILED'); expect(state.refunds[0].reason).toContain('expired'); expect(confirm).not.toHaveBeenCalled();
  });
  it('rejects another account before calling the gateway', async () => {
    await expect(payments.verifyPayment({ bookingId: 'booking', merchantTxnId: 'merchant' }, 'other')).rejects.toThrow();
    expect(gateway.verifyPayment).not.toHaveBeenCalled();
  });
});
