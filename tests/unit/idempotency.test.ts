import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ idempotencyRecord: { findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() } }));
vi.mock('../../src/infrastructure/database', () => ({ getPrismaClient: () => db }));
vi.mock('../../src/infrastructure/logger', () => ({ logger: { warn: vi.fn() } }));
import { idempotencyMiddleware } from '../../src/app/middleware/idempotency';

const request = (owner = 'owner-a', body = { amount: 100 }) => ({
  method: 'POST', baseUrl: '/api/v1/checkout', originalUrl: '/api/v1/checkout',
  user: { sub: owner }, body, get: () => 'test-request-key',
});
const response = () => {
  const res = { statusCode: 200, status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
};

beforeEach(() => {
  vi.resetAllMocks();
  db.idempotencyRecord.findUnique.mockResolvedValue(null);
  db.idempotencyRecord.create.mockImplementation(async ({ data }) => ({ id: 'record', ...data }));
  db.idempotencyRecord.updateMany.mockResolvedValue({ count: 1 });
});

describe('idempotency authorization and request boundaries', () => {
  it('isolates the same client key across owners', async () => {
    const middleware = idempotencyMiddleware();
    await middleware(request() as any, response() as any, vi.fn());
    await middleware(request('owner-b') as any, response() as any, vi.fn());
    const keys = db.idempotencyRecord.create.mock.calls.map(([arg]) => arg.data.key);
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });
  it('replays a resolved matching request without executing it again', async () => {
    const middleware = idempotencyMiddleware();
    await middleware(request() as any, response() as any, vi.fn());
    const record = db.idempotencyRecord.create.mock.calls[0][0].data;
    db.idempotencyRecord.findUnique.mockResolvedValue({ ...record, status: 'RESOLVED', responseCode: 201, responseBody: { bookingId: 'owned-booking' }, expiresAt: new Date(Date.now() + 60000) });
    const res = response(), next = vi.fn();
    await middleware(request() as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ bookingId: 'owned-booking' });
    expect(next).not.toHaveBeenCalled();
  });
  it('rejects a changed financial payload even with the same client key', async () => {
    const middleware = idempotencyMiddleware();
    await middleware(request() as any, response() as any, vi.fn());
    db.idempotencyRecord.findUnique.mockResolvedValue(db.idempotencyRecord.create.mock.calls[0][0].data);
    const next = vi.fn();
    await middleware(request('owner-a', { amount: 200 }) as any, response() as any, next);
    expect(next.mock.calls[0][0].message).toContain('another request');
    expect(db.idempotencyRecord.create).toHaveBeenCalledTimes(1);
  });
  it('rejects a competing atomic database claim', async () => {
    db.idempotencyRecord.create.mockRejectedValue({ code: 'P2002' });
    const next = vi.fn();
    await idempotencyMiddleware()(request() as any, response() as any, next);
    expect(next.mock.calls[0][0].message).toContain('already being processed');
  });
});
