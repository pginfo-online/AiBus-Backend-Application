import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ booking: {} as any, operation: null as any, refunds: [] as any[], balance: 0 }));
const provider = vi.hoisted(() => ({ isCancellable: vi.fn(), cancelSeats: vi.fn() }));
const db = vi.hoisted(() => {
  const methods: any = {
    $queryRaw: vi.fn(async () => []),
    booking: {
      findFirst: vi.fn(async () => state.booking), findUniqueOrThrow: vi.fn(async () => ({ ...state.booking, refunds: state.refunds })),
      updateMany: vi.fn(async ({ data }: any) => { Object.assign(state.booking, data); return { count: 1 }; }),
      update: vi.fn(async ({ data }: any) => { Object.assign(state.booking, data); return state.booking; }),
    },
    cancellation: {
      create: vi.fn(async ({ data }: any) => { state.operation = { ...data, id: 'cancel-1', refunds: state.refunds }; state.booking.cancellations.push(state.operation); return state.operation; }),
      findUniqueOrThrow: vi.fn(async () => ({ ...state.operation, refunds: state.refunds })),
      update: vi.fn(async ({ data }: any) => { Object.assign(state.operation, data); return state.operation; }),
      updateMany: vi.fn(async ({ data }: any) => { Object.assign(state.operation, data); return { count: 1 }; }),
    },
    bookingSeat: { updateMany: vi.fn(async ({ where, data }: any) => { state.booking.seats.filter((s: any) => where.seatNo.in.includes(s.seatNo)).forEach((s: any) => Object.assign(s, data)); return { count: 1 }; }) },
    ticket: { update: vi.fn(async () => ({})) },
    user: { update: vi.fn(async ({ data }: any) => { state.balance += data.walletBalance.increment; return { walletBalance: state.balance }; }) },
    walletTransaction: { create: vi.fn(async () => ({})) },
    refund: {
      create: vi.fn(async ({ data }: any) => { const r = { ...data, id: `refund-${state.refunds.length}` }; state.refunds.push(r); return r; }),
      aggregate: vi.fn(async ({ where }: any) => ({ _sum: { amount: state.refunds.filter((r) => r.paymentId === where.paymentId && r.status === 'COMPLETED').reduce((sum, r) => sum + r.amount, 0) } })),
    },
    payment: { update: vi.fn(async () => ({})) },
    agentWallet: { findUniqueOrThrow: vi.fn(async () => ({ creditUsed: 100 })), update: vi.fn(async () => ({})) },
    ledgerEntry: { createMany: vi.fn(async () => ({ count: 1 })) },
    commissionSnapshot: { update: vi.fn(async () => ({})) },
  };
  methods.$transaction = (callback: any) => callback(methods);
  return methods;
});
vi.mock('../../src/infrastructure/database', () => ({ getPrismaClient: () => db }));
vi.mock('../../src/providers/gds/gdsAdapter', () => ({ GdsAdapter: { getInstance: () => provider } }));
vi.mock('../../src/infrastructure/queues', () => ({ addJob: vi.fn(async () => null) }));
let service: import('../../src/modules/cancellations/cancellations.service').CancellationsService;
beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('DATABASE_URL', 'postgresql://localhost/test'); vi.stubEnv('JWT_ACCESS_SECRET', 'a'.repeat(32)); vi.stubEnv('JWT_REFRESH_SECRET', 'b'.repeat(32)); vi.stubEnv('GDS_CLIENT_ID', '1'); vi.stubEnv('GDS_CLIENT_SECRET', 'local-test');
  service = (await import('../../src/modules/cancellations/cancellations.service')).CancellationsService.getInstance();
});
beforeEach(() => {
  vi.clearAllMocks(); state.operation = null; state.refunds = []; state.balance = 0;
  state.booking = { id: '00000000-0000-4000-8000-000000000001', userId: 'owner', status: 'CONFIRMED', version: 1, totalFare: 180, walletAmount: 50, bookingNumber: 'BOOK-1', providerTicketNo: 'ticket-old', providerPnrNo: 'pnr-old', seats: [{ seatNo: 'B', fareTotal: 100 }, { seatNo: 'C', fareTotal: 100 }], payments: [{ id: 'pay-1', status: 'SUCCESS', gateway: 'RAZORPAY', amount: 130 }], cancellations: [], refunds: [], ticket: { id: 'ticket' } };
  provider.isCancellable.mockResolvedValue({ IsCancellable: true, RefundAmount: 90, ChargeAmt: 10 });
  provider.cancelSeats.mockResolvedValue({ Status: 1, RefundAmount: 90, ChargeAmt: 10, NewTicketNo: 'ticket-new', NewPNRNo: 'pnr-new' });
});
describe('persisted cancellation lifecycle', () => {
  it('repays agent credit before returning cash on cancellation', async () => {
    state.booking.agentId = '00000000-0000-4000-8000-000000000012';
    state.booking.totalFare = 200; state.booking.walletAmount = 0;
    state.booking.commissionSnapshot = { commissionAmt: 20, reversalAmt: 0 };
    state.booking.payments = [{ id: 'pay-1', status: 'SUCCESS', gateway: 'WALLET', amount: 180, metadata: { creditDebited: 100 } }];
    await service.cancelSeats('BOOK-1', ['B'], undefined, 'owner');
    expect(db.agentWallet.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ creditUsed: { decrement: 81 }, cashBalance: { increment: 0 } }) }));
    expect(db.user.update).not.toHaveBeenCalled();
  });
  it('settles only selected seats, replaces the active ticket and splits actual wallet/gateway funds', async () => {
    const result = await service.cancelSeats('BOOK-1', ['B'], undefined, 'owner');
    expect(result.cancellation.status).toBe('COMPLETED'); expect(state.booking.status).toBe('CONFIRMED');
    expect(state.booking.providerTicketNo).toBe('ticket-new'); expect(state.booking.seats[0].cancelledAt).toBeInstanceOf(Date); expect(state.booking.seats[1].cancelledAt).toBeUndefined();
    expect(state.balance).toBe(50); expect(result.refunds.map((r) => Number(r.amount))).toEqual([50, 30]);
    expect(result.refunds[0].status).toBe('COMPLETED'); expect(result.refunds[1].status).toBe('PENDING');
  });
  it('replays a completed operation without cancelling another seat or issuing another refund', async () => {
    await service.cancelSeats('BOOK-1', ['B'], undefined, 'owner');
    await service.cancelSeats('BOOK-1', ['B'], undefined, 'owner');
    expect(provider.cancelSeats).toHaveBeenCalledTimes(1); expect(state.refunds).toHaveLength(2);
  });
  it('retains a timed-out operator request and does not blindly repeat it', async () => {
    provider.cancelSeats.mockRejectedValue(new Error('timeout'));
    expect((await service.cancelSeats('BOOK-1', ['B'], undefined, 'owner')).cancellation.status).toBe('REQUESTED');
    await service.cancelSeats('BOOK-1', ['B'], undefined, 'owner');
    expect(provider.cancelSeats).toHaveBeenCalledTimes(1); expect(state.refunds).toHaveLength(0);
  });
  it('does not settle a partial cancellation with missing replacement identifiers', async () => {
    provider.cancelSeats.mockResolvedValue({ Status: 1, RefundAmount: 90 });
    expect((await service.cancelSeats('BOOK-1', ['B'], undefined, 'owner')).cancellation.status).toBe('REQUESTED');
    expect(state.refunds).toHaveLength(0);
  });
  it('does not spend duplicate-capture refunds when calculating the legitimate fare refund', async () => {
    state.booking.paidPaymentId = 'pay-1';
    state.booking.payments.unshift({id:'extra-payment',status:'SUCCESS',gateway:'RAZORPAY',amount:130});
    state.refunds.push({id:'duplicate-refund',amount:130,status:'COMPLETED',destination:'ORIGINAL_PAYMENT_METHOD',paymentId:'extra-payment'});
    state.booking.refunds = state.refunds;
    await service.cancelSeats('BOOK-1',['B'],undefined,'owner');
    expect(state.refunds.filter((r) => r.cancellationId === 'cancel-1').map((r) => Number(r.amount))).toEqual([50,30]);
    expect(state.refunds.find((r) => r.cancellationId === 'cancel-1' && r.destination === 'ORIGINAL_PAYMENT_METHOD').paymentId).toBe('pay-1');
  });
  it('rejects foreign bookings and invalid seat selections before any provider mutation', async () => {
    await expect(service.cancelSeats('BOOK-1', ['B'], undefined, 'foreign')).rejects.toThrow();
    await expect(service.cancelSeats('BOOK-1', ['Z'], undefined, 'owner')).rejects.toThrow();
    expect(provider.cancelSeats).not.toHaveBeenCalled();
  });
});
