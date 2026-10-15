import { vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { BookingStatus, HoldStatus, PaymentStatus, TicketStatus, CancellationStatus, RefundStatus } from '@prisma/client';

export function createPrismaMock() {
  const holds = new Map<string, any>();
  const bookings = new Map<string, any>();
  const payments = new Map<string, any>();
  const cancellations = new Map<string, any>();
  const tickets = new Map<string, any>();
  const refunds = new Map<string, any>();

  const mockInstance: any = {
    seatHold: {
      findFirst: vi.fn().mockImplementation(async () => null),
      findUnique: vi.fn().mockImplementation(async ({ where }) => holds.get(where.id) || null),
      create: vi.fn().mockImplementation(async ({ data }) => {
        const item = { id: uuidv4(), status: HoldStatus.ACTIVE, ...data };
        holds.set(item.id, item);
        return item;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        const item = holds.get(where.id);
        if (item) Object.assign(item, data);
        return item;
      }),
      updateMany: vi.fn().mockImplementation(async () => ({ count: 1 })),
    },
    booking: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        const b = bookings.get(where.id);
        if (!b) return null;
        const ticketItem = Array.from(tickets.values()).find((t) => t.bookingId === b.id);
        return {
          ...b,
          seats: b.seats || [],
          passengers: b.passengers || [],
          ticket: ticketItem || null,
          payments: Array.from(payments.values()).filter((p) => p.bookingId === b.id),
        };
      }),
      findMany: vi.fn().mockImplementation(async () => Array.from(bookings.values())),
      create: vi.fn().mockImplementation(async ({ data }) => {
        const id = uuidv4();
        const seats = data.seats?.create?.map((s: any) => ({ id: uuidv4(), bookingId: id, ...s })) || [];
        const passengers = data.passengers?.create?.map((p: any) => ({ id: uuidv4(), bookingId: id, ...p })) || [];
        const item = { id, version: 1, ...data, seats, passengers };
        bookings.set(id, item);
        return item;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        const item = bookings.get(where.id);
        if (item) Object.assign(item, data);
        return item;
      }),
      updateMany: vi.fn().mockImplementation(async ({ where, data }) => {
        const item = bookings.get(where?.id);
        if (item) Object.assign(item, data);
        return { count: 1 };
      }),
    },
    payment: {
      findFirst: vi.fn().mockImplementation(async ({ where }) => {
        if (where?.bookingId) {
          return Array.from(payments.values()).find((p) => p.bookingId === where.bookingId && (!where.status || p.status === where.status)) || null;
        }
        return null;
      }),
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        let p;
        if (where.merchantTxnId) {
          p = Array.from(payments.values()).find((item) => item.merchantTxnId === where.merchantTxnId);
        } else if (where.id) {
          p = payments.get(where.id);
        }
        if (p) {
          const b = bookings.get(p.bookingId);
          return { ...p, booking: b };
        }
        return null;
      }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        const item = { id: uuidv4(), ...data };
        payments.set(item.id, item);
        return item;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        const item = payments.get(where.id);
        if (item) Object.assign(item, data);
        return item;
      }),
    },
    ticket: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        let t;
        if (where.bookingId) {
          t = Array.from(tickets.values()).find((item) => item.bookingId === where.bookingId);
        } else if (where.ticketNumber) {
          t = Array.from(tickets.values()).find((item) => item.ticketNumber === where.ticketNumber);
        }
        if (!t) return null;
        const b = bookings.get(t.bookingId);
        return { ...t, booking: b };
      }),
      create: vi.fn().mockImplementation(async ({ data }) => {
        const item = { id: uuidv4(), ...data };
        tickets.set(item.id, item);
        return item;
      }),
    },
    cancellation: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        const item = { id: uuidv4(), ...data };
        cancellations.set(item.id, item);
        return item;
      }),
    },
    refund: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        const item = { id: uuidv4(), ...data };
        refunds.set(item.id, item);
        return item;
      }),
      update: vi.fn().mockImplementation(async ({ where, data }) => {
        const item = refunds.get(where.id);
        if (item) Object.assign(item, data);
        return item;
      }),
    },
    providerTransaction: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        return { id: uuidv4(), ...data };
      }),
    },
    webhookEvent: {
      create: vi.fn().mockImplementation(async ({ data }) => {
        return { id: uuidv4(), processed: false, ...data };
      }),
      findFirst: vi.fn().mockImplementation(async () => null),
      update: vi.fn().mockImplementation(async ({ where, data }) => ({ id: where.id, ...data })),
    },
    agentStaff: {
      findFirst: vi.fn().mockImplementation(async () => null),
      findMany: vi.fn().mockImplementation(async () => []),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: uuidv4(), ...data })),
      upsert: vi.fn().mockImplementation(async ({ create }) => ({ id: uuidv4(), ...create })),
    },
    agent: {
      findUnique: vi.fn().mockImplementation(async () => null),
      findFirst: vi.fn().mockImplementation(async () => null),
      findMany: vi.fn().mockImplementation(async () => []),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: uuidv4(), ...data })),
      update: vi.fn().mockImplementation(async ({ data }) => ({ id: uuidv4(), ...data })),
    },
    agentWallet: {
      findUnique: vi.fn().mockImplementation(async () => null),
      update: vi.fn().mockImplementation(async ({ data }) => ({ ...data })),
      updateMany: vi.fn().mockImplementation(async () => ({ count: 1 })),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: uuidv4(), ...data })),
    },
    commissionRule: {
      findMany: vi.fn().mockImplementation(async () => []),
      findUnique: vi.fn().mockImplementation(async () => null),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: uuidv4(), ...data })),
      update: vi.fn().mockImplementation(async ({ data }) => ({ id: uuidv4(), ...data })),
      delete: vi.fn().mockImplementation(async () => ({ id: uuidv4() })),
      count: vi.fn().mockImplementation(async () => 0),
    },
    commissionSnapshot: {
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: uuidv4(), ...data })),
      findUnique: vi.fn().mockImplementation(async () => null),
      findMany: vi.fn().mockImplementation(async () => []),
      update: vi.fn().mockImplementation(async ({ data }) => ({ ...data })),
    },
    ledgerEntry: {
      createMany: vi.fn().mockImplementation(async ({ data }) => ({ count: data?.length || 0 })),
      findMany: vi.fn().mockImplementation(async () => []),
      findFirst: vi.fn().mockImplementation(async () => null),
      count: vi.fn().mockImplementation(async () => 0),
    },
    walletTopup: {
      findUnique: vi.fn().mockImplementation(async () => null),
      findFirst: vi.fn().mockImplementation(async () => null),
      findMany: vi.fn().mockImplementation(async () => []),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: uuidv4(), ...data })),
      update: vi.fn().mockImplementation(async ({ data }) => ({ ...data })),
    },
    paymentGatewayConfig: {
      findUnique: vi.fn().mockImplementation(async () => null),
      findFirst: vi.fn().mockImplementation(async () => null),
      findMany: vi.fn().mockImplementation(async () => []),
      create: vi.fn().mockImplementation(async ({ data }) => ({ id: uuidv4(), ...data })),
      update: vi.fn().mockImplementation(async ({ data }) => ({ ...data })),
      upsert: vi.fn().mockImplementation(async ({ create }) => ({ id: uuidv4(), ...create })),
    },
    $queryRaw: vi.fn().mockImplementation(async () => [{ 1: 1 }]),
    $transaction: vi.fn().mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(mockInstance);
      }
      return Promise.all(callback);
    }),
  };

  return mockInstance;
}
