import { describe, it, expect } from 'vitest';
import {
  assertLedgerBalance,
  buildLedgerPostingData,
  buildBookingPaymentLines,
  buildRefundLines,
  buildTopupLines,
  LedgerLine,
} from '../../src/infrastructure/ledger';
import { LedgerEntryType } from '@prisma/client';

describe('Double-Entry Financial Ledger Invariants', () => {
  it('should pass assertLedgerBalance when debits equal credits', () => {
    const lines: LedgerLine[] = [
      {
        type: LedgerEntryType.AGENT_WALLET_DEBIT,
        debitAmount: 1500,
        creditAmount: 0,
        description: 'Agent booking debit',
      },
      {
        type: LedgerEntryType.PLATFORM_REVENUE_CREDIT,
        debitAmount: 0,
        creditAmount: 1500,
        description: 'Platform booking revenue',
      },
    ];

    expect(() => assertLedgerBalance(lines)).not.toThrow();
  });

  it('should throw an error when debits and credits do not balance', () => {
    const lines: LedgerLine[] = [
      {
        type: LedgerEntryType.AGENT_WALLET_DEBIT,
        debitAmount: 1500,
        creditAmount: 0,
        description: 'Agent booking debit',
      },
      {
        type: LedgerEntryType.PLATFORM_REVENUE_CREDIT,
        debitAmount: 0,
        creditAmount: 1450, // Unbalanced by 50!
        description: 'Platform booking revenue',
      },
    ];

    expect(() => assertLedgerBalance(lines)).toThrow(/Ledger invariant violation/);
  });

  it('should generate perfectly balanced lines for booking payment (Net debit)', () => {
    const grossFare = 2000;
    const commissionAmt = 150;
    const netFare = 1850;
    const idempotencyPrefix = 'BOOK-TEST-123';

    const lines = buildBookingPaymentLines({
      bookingId: 'booking-uuid-1',
      agentId: 'agent-uuid-1',
      grossFare,
      commissionAmt,
      netFare,
      idempotencyPrefix,
    });

    // Verify invariant holds
    expect(() => assertLedgerBalance(lines)).not.toThrow();

    // Verify net wallet debit: 1850
    const walletDebit = lines.find((l) => l.type === LedgerEntryType.AGENT_WALLET_DEBIT);
    expect(walletDebit).toBeDefined();
    expect(walletDebit?.debitAmount).toBe(1850);
    expect(walletDebit?.creditAmount).toBe(0);

    // Verify platform revenue credit: 1850
    const revenueCredit = lines.find((l) => l.type === LedgerEntryType.PLATFORM_REVENUE_CREDIT);
    expect(revenueCredit).toBeDefined();
    expect(revenueCredit?.creditAmount).toBe(1850);

    // Verify commission credit: 150
    const commCredit = lines.find((l) => l.type === LedgerEntryType.COMMISSION_CREDIT);
    expect(commCredit).toBeDefined();
    expect(commCredit?.creditAmount).toBe(150);

    // Verify total debits = total credits = 2000
    const totalDebits = lines.reduce((acc, l) => acc + (l.debitAmount ?? 0), 0);
    const totalCredits = lines.reduce((acc, l) => acc + (l.creditAmount ?? 0), 0);
    expect(totalDebits).toBe(2000);
    expect(totalCredits).toBe(2000);
  });

  it('should generate perfectly balanced lines for booking payment with zero commission', () => {
    const grossFare = 1000;
    const commissionAmt = 0;
    const netFare = 1000;
    const idempotencyPrefix = 'BOOK-ZERO-COMM';

    const lines = buildBookingPaymentLines({
      bookingId: 'booking-uuid-zero',
      agentId: 'agent-uuid-zero',
      grossFare,
      commissionAmt,
      netFare,
      idempotencyPrefix,
    });

    expect(() => assertLedgerBalance(lines)).not.toThrow();
    const totalDebits = lines.reduce((acc, l) => acc + (l.debitAmount ?? 0), 0);
    const totalCredits = lines.reduce((acc, l) => acc + (l.creditAmount ?? 0), 0);
    expect(totalDebits).toBe(1000);
    expect(totalCredits).toBe(1000);
  });

  it('should generate perfectly balanced lines for refund with commission clawback', () => {
    const refundAmount = 1800; // Customer/Agent refund
    const commissionReversal = 120; // Reversal of earned commission
    const idempotencyPrefix = 'REF-TEST-456';

    const lines = buildRefundLines({
      bookingId: 'booking-uuid-ref',
      cancellationId: 'cancellation-uuid-ref',
      agentId: 'agent-uuid-ref',
      refundAmount,
      commissionReversal,
      idempotencyPrefix,
    });

    expect(() => assertLedgerBalance(lines)).not.toThrow();

    const refundCredit = lines.find((l) => l.type === LedgerEntryType.REFUND_CREDIT);
    expect(refundCredit?.creditAmount).toBe(1800);

    const commReversal = lines.find((l) => l.type === LedgerEntryType.COMMISSION_REVERSAL);
    expect(commReversal?.debitAmount).toBe(120);

    const netPlatformDebit = lines.find((l) => l.type === LedgerEntryType.PLATFORM_REVENUE_CREDIT);
    expect(netPlatformDebit?.debitAmount).toBe(1800);

    const totalDebits = lines.reduce((acc, l) => acc + (l.debitAmount ?? 0), 0);
    const totalCredits = lines.reduce((acc, l) => acc + (l.creditAmount ?? 0), 0);
    expect(totalDebits).toBe(1920);
    expect(totalCredits).toBe(1920);
  });

  it('should generate perfectly balanced lines for wallet top-up', () => {
    const amount = 50000;
    const idempotencyPrefix = 'TOPUP-TEST-789';

    const lines = buildTopupLines({
      topupId: 'topup-uuid-789',
      agentId: 'agent-uuid-789',
      amount,
      idempotencyPrefix,
    });

    expect(() => assertLedgerBalance(lines)).not.toThrow();

    const walletCredit = lines.find((l) => l.type === LedgerEntryType.AGENT_WALLET_TOPUP);
    expect(walletCredit?.creditAmount).toBe(50000);

    const platformDebit = lines.find((l) => l.type === LedgerEntryType.PLATFORM_REVENUE_CREDIT);
    expect(platformDebit?.debitAmount).toBe(50000);
  });

  it('should stamp batchId and unique idempotency keys in buildLedgerPostingData', () => {
    const lines = buildBookingPaymentLines({
      bookingId: 'booking-uuid-002',
      agentId: 'agent-uuid-001',
      grossFare: 1200,
      commissionAmt: 60,
      netFare: 1140,
      idempotencyPrefix: 'BATCH-TEST',
    });

    const postingData = buildLedgerPostingData({
      agentId: 'agent-uuid-001',
      bookingId: 'booking-uuid-002',
      referenceId: 'ref-003',
      createdBy: 'SYSTEM',
      lines,
    });

    expect(postingData.length).toBe(lines.length);
    const batchId = postingData[0].batchId;
    expect(batchId).toBeDefined();

    for (const record of postingData) {
      expect(record.batchId).toBe(batchId);
      expect(record.agentId).toBe('agent-uuid-001');
      expect(record.bookingId).toBe('booking-uuid-002');
      expect(record.idempotencyKey).toMatch(/^BATCH-TEST:/);
    }
  });
});
