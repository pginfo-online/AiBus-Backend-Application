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
        return {
          ...b,
          seats: b.seats || [],
          passengers: b.passengers || [],
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
    },
    payment: {
      findUnique: vi.fn().mockImplementation(async ({ where }) => {
        if (where.merchantTxnId) {
          const p = Array.from(payments.values()).find((item) => item.merchantTxnId === where.merchantTxnId);
          if (p) return { ...p, booking: bookings.get(p.bookingId) };
        }
        return payments.get(where.id) || null;
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
    $transaction: vi.fn().mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(mockInstance);
      }
      return Promise.all(callback);
    }),
  };

  return mockInstance;
}
