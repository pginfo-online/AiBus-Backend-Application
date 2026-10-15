import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { getPrismaClient } from '../../src/infrastructure/database';
import { BookingStatus } from '@prisma/client';
import { ConflictError, ValidationError, AuthorizationError } from '../../src/shared/errors';

// Mock database
vi.mock('../../src/infrastructure/database', () => {
  const mockBooking = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const mockSeatHold = {
    findFirst: vi.fn(),
  };
  const mockAgentWallet = {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  };
  const mockLedgerEntry = {
    createMany: vi.fn(),
  };
  const mockPayment = {
    create: vi.fn(),
  };

  const client = {
    booking: mockBooking,
    seatHold: mockSeatHold,
    agentWallet: mockAgentWallet,
    ledgerEntry: mockLedgerEntry,
    payment: mockPayment,
    $transaction: vi.fn().mockImplementation(async (cb) => {
      if (typeof cb === 'function') {
        return cb(client);
      }
      return Promise.all(cb);
    }),
  };

  return {
    getPrismaClient: () => client,
  };
});

describe('Agent Wallet Concurrency & Authorization Rules', () => {
  const prismaMock = getPrismaClient() as any;
  const paymentsService = PaymentsService.getInstance();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default valid hold mock
    prismaMock.seatHold.findFirst.mockResolvedValue({
      expiresAt: new Date(Date.now() + 600000), // 10m in future
    });
  });

  it('should throw ConflictError when optimistic locking detects concurrent wallet modification', async () => {
    const bookingId = 'booking-concurrency-1';
    const agentId = 'agent-uuid-1';

    prismaMock.booking.findUnique.mockResolvedValueOnce({
      id: bookingId,
      bookingNumber: 'AIB-1001',
      agentId,
      status: BookingStatus.HELD,
      totalFare: 1500,
      commissionSnapshot: { commissionAmt: 100 },
    });

    prismaMock.agentWallet.findUnique.mockResolvedValueOnce({
      id: 'wallet-1',
      agentId,
      cashBalance: 5000,
      creditLimit: 0,
      creditUsed: 0,
      isFrozen: false,
      version: 5,
    });

    // Simulate concurrent modification: updateMany returns count: 0 (version mismatch)
    prismaMock.agentWallet.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      paymentsService.payWithWallet(bookingId, agentId, 'user-1')
    ).rejects.toThrow(ConflictError);
  });

  it('should throw ValidationError when total available funds (cash + credit) are insufficient', async () => {
    const bookingId = 'booking-funds-2';
    const agentId = 'agent-uuid-2';

    prismaMock.booking.findUnique.mockResolvedValueOnce({
      id: bookingId,
      bookingNumber: 'AIB-1002',
      agentId,
      status: BookingStatus.HELD,
      totalFare: 2000,
      commissionSnapshot: { commissionAmt: 0 },
    });

    prismaMock.agentWallet.findUnique.mockResolvedValueOnce({
      id: 'wallet-2',
      agentId,
      cashBalance: 500, // Only 500 cash
      creditLimit: 1000, // 1000 credit limit
      creditUsed: 500,  // 500 already used -> available credit = 500
      // Total available = 500 + 500 = 1000, but required = 2000
      isFrozen: false,
      version: 1,
    });

    await expect(
      paymentsService.payWithWallet(bookingId, agentId, 'user-2')
    ).rejects.toThrow(ValidationError);
  });

  it('should throw AuthorizationError when agent wallet is frozen', async () => {
    const bookingId = 'booking-frozen-3';
    const agentId = 'agent-uuid-3';

    prismaMock.booking.findUnique.mockResolvedValueOnce({
      id: bookingId,
      bookingNumber: 'AIB-1003',
      agentId,
      status: BookingStatus.HELD,
      totalFare: 1200,
      commissionSnapshot: { commissionAmt: 50 },
    });

    prismaMock.agentWallet.findUnique.mockResolvedValueOnce({
      id: 'wallet-3',
      agentId,
      cashBalance: 10000,
      creditLimit: 0,
      creditUsed: 0,
      isFrozen: true,
      frozenReason: 'Compliance audit pending',
      version: 2,
    });

    await expect(
      paymentsService.payWithWallet(bookingId, agentId, 'user-3')
    ).rejects.toThrow(AuthorizationError);
  });

  it('should throw AuthorizationError when attempting to pay for another agent booking', async () => {
    const bookingId = 'booking-alien-4';
    const callerAgentId = 'agent-uuid-caller';
    const victimAgentId = 'agent-uuid-victim';

    prismaMock.booking.findUnique.mockResolvedValueOnce({
      id: bookingId,
      bookingNumber: 'AIB-1004',
      agentId: victimAgentId, // Belongs to different agent!
      status: BookingStatus.HELD,
      totalFare: 1200,
      commissionSnapshot: null,
    });

    await expect(
      paymentsService.payWithWallet(bookingId, callerAgentId, 'user-4')
    ).rejects.toThrow(AuthorizationError);
  });
});
