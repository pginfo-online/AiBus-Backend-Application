import { Prisma, LedgerEntryType } from '@prisma/client';
export interface LedgerLine {
    type: LedgerEntryType;
    debitAmount?: number;
    creditAmount?: number;
    description: string;
    idempotencyKey?: string;
}
export interface PostLedgerParams {
    agentId?: string;
    bookingId?: string;
    cancellationId?: string;
    refundId?: string;
    topupId?: string;
    referenceId?: string;
    createdBy?: string;
    lines: LedgerLine[];
}
/**
 * Validates that a posting batch is balanced (debits == credits).
 * Throws a structured error if the invariant is violated.
 * Must be called BEFORE committing any ledger entries.
 */
export declare function assertLedgerBalance(lines: LedgerLine[]): void;
/**
 * Builds Prisma createMany data for a balanced ledger posting batch.
 * The caller must call this inside a Prisma.$transaction to guarantee atomicity.
 *
 * @example
 * await tx.ledgerEntry.createMany({ data: buildLedgerPostingData(params) });
 */
export declare function buildLedgerPostingData(params: PostLedgerParams): Prisma.LedgerEntryCreateManyInput[];
/**
 * Build booking-payment ledger posting (agent wallet debit + platform revenue credit).
 * Called inside the wallet-debit Prisma transaction.
 */
export declare function buildBookingPaymentLines(params: {
    bookingId: string;
    agentId: string;
    netFare: number;
    commissionAmt: number;
    grossFare: number;
    idempotencyPrefix: string;
}): LedgerLine[];
/**
 * Build wallet top-up ledger posting (wallet credit).
 */
export declare function buildTopupLines(params: {
    topupId: string;
    agentId: string;
    amount: number;
    idempotencyPrefix: string;
}): LedgerLine[];
/**
 * Build cancellation refund ledger posting (wallet refund credit).
 */
export declare function buildRefundLines(params: {
    bookingId: string;
    cancellationId: string;
    agentId: string;
    refundAmount: number;
    commissionReversal: number;
    idempotencyPrefix: string;
}): LedgerLine[];
//# sourceMappingURL=index.d.ts.map