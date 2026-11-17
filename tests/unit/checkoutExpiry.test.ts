import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ booking: {} as any, balance: 0 }));
const release = vi.hoisted(() => vi.fn(async () => undefined));
const db = vi.hoisted(() => {
  const tx: any = {
    $queryRaw: vi.fn(async () => []),
    booking: { findUnique: vi.fn(async () => state.booking), update: vi.fn(async ({ data }: any) => Object.assign(state.booking, data)) },
    user: { update: vi.fn(async ({ data }: any) => ({ walletBalance: state.balance += data.walletBalance.increment })) },
    walletTransaction: { create: vi.fn(async () => ({})) },
    refund: { findUnique: vi.fn(async () => null), create: vi.fn(async () => ({})) },
  };
  tx.$transaction = (callback: any) => callback(tx);
  return tx;
});
vi.mock('../../src/infrastructure/database', () => ({ getPrismaClient: () => db }));
vi.mock('../../src/modules/coupons/coupons.service', () => ({ CouponsService: { getInstance: () => ({ releaseCheckoutCoupon: release }) } }));
import { expireUnpaidCheckout } from '../../src/modules/bookings/expireCheckout';

beforeEach(() => {
  vi.clearAllMocks(); state.balance = 0;
  state.booking = { id: 'booking', userId: 'owner', status: 'PAYMENT_PENDING', walletAmount: 50, payments: [], holds: [{ expiresAt: new Date(Date.now() - 180000) }] };
});
describe('expired checkout wallet escrow', () => {
  it('returns unused wallet funds and releases the offer exactly once', async () => {
    await expireUnpaidCheckout('booking');
    await expireUnpaidCheckout('booking');
    expect(state.balance).toBe(50);
    expect(db.refund.create).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
    expect(state.booking.status).toBe('HOLD_EXPIRED');
  });
  it('does not release funds after an accepted payment capture', async () => {
    state.booking.payments = [{ status: 'SUCCESS' }];
    await expireUnpaidCheckout('booking');
    expect(db.user.update).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });
  it('honors the gateway callback grace period after hold expiry', async () => {
    state.booking.holds[0].expiresAt = new Date(Date.now() - 30000);
    await expireUnpaidCheckout('booking');
    expect(db.booking.update).not.toHaveBeenCalled();
  });
  it('releases a gateway-only checkout offer without issuing a wallet credit', async () => {
    state.booking.walletAmount = 0;
    await expireUnpaidCheckout('booking');
    expect(release).toHaveBeenCalledTimes(1);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});
