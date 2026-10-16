"use strict";
// ---------------------------------------------------------------------------
// LedgerService — Immutable Double-Entry Ledger
// ---------------------------------------------------------------------------
// Rules:
//   1. Every posting batch MUST balance: SUM(debit) === SUM(credit)
//   2. Rows are NEVER updated — only new entries and reversals are inserted
//   3. idempotencyKey on LedgerEntry prevents duplicate postings at DB level
//   4. All postings are wrapped in the CALLER's Prisma transaction — this
//      service only assembles and validates; it does not open its own tx.
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertLedgerBalance = assertLedgerBalance;
exports.buildLedgerPostingData = buildLedgerPostingData;
exports.buildBookingPaymentLines = buildBookingPaymentLines;
exports.buildTopupLines = buildTopupLines;
exports.buildRefundLines = buildRefundLines;
const uuid_1 = require("uuid");
const client_1 = require("@prisma/client");
const logger_1 = require("../logger");
const ledgerLogger = logger_1.logger.child({ module: 'ledger-service' });
/**
 * Validates that a posting batch is balanced (debits == credits).
 * Throws a structured error if the invariant is violated.
 * Must be called BEFORE committing any ledger entries.
 */
function assertLedgerBalance(lines) {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of lines) {
        totalDebit += line.debitAmount ?? 0;
        totalCredit += line.creditAmount ?? 0;
    }
    // Use epsilon comparison to handle floating-point rounding
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
        const msg = `Ledger invariant violation: debit=${totalDebit.toFixed(4)}, credit=${totalCredit.toFixed(4)}, delta=${(totalDebit - totalCredit).toFixed(4)}`;
        ledgerLogger.error({ totalDebit, totalCredit }, msg);
        throw new Error(msg);
    }
}
/**
 * Builds Prisma createMany data for a balanced ledger posting batch.
 * The caller must call this inside a Prisma.$transaction to guarantee atomicity.
 *
 * @example
 * await tx.ledgerEntry.createMany({ data: buildLedgerPostingData(params) });
 */
function buildLedgerPostingData(params) {
    assertLedgerBalance(params.lines);
    const batchId = (0, uuid_1.v4)();
    const now = new Date();
    return params.lines.map((line) => ({
        id: (0, uuid_1.v4)(),
        batchId,
        agentId: params.agentId ?? null,
        bookingId: params.bookingId ?? null,
        cancellationId: params.cancellationId ?? null,
        refundId: params.refundId ?? null,
        topupId: params.topupId ?? null,
        type: line.type,
        debitAmount: new client_1.Prisma.Decimal(line.debitAmount ?? 0),
        creditAmount: new client_1.Prisma.Decimal(line.creditAmount ?? 0),
        currency: 'INR',
        description: line.description,
        referenceId: params.referenceId ?? null,
        idempotencyKey: line.idempotencyKey ?? null,
        postedAt: now,
        createdBy: params.createdBy ?? 'SYSTEM',
    }));
}
/**
 * Build booking-payment ledger posting (agent wallet debit + platform revenue credit).
 * Called inside the wallet-debit Prisma transaction.
 */
function buildBookingPaymentLines(params) {
    return [
        {
            type: client_1.LedgerEntryType.AGENT_WALLET_DEBIT,
            debitAmount: params.netFare,
            creditAmount: 0,
            description: `Wallet debit for booking ${params.bookingId} (net of commission)`,
            idempotencyKey: `${params.idempotencyPrefix}:wallet_debit`,
        },
        {
            type: client_1.LedgerEntryType.COMMISSION_CREDIT,
            debitAmount: 0,
            creditAmount: params.commissionAmt,
            description: `Commission credit for booking ${params.bookingId}`,
            idempotencyKey: `${params.idempotencyPrefix}:commission_credit`,
        },
        {
            type: client_1.LedgerEntryType.PLATFORM_REVENUE_CREDIT,
            debitAmount: 0,
            creditAmount: params.netFare,
            description: `Platform revenue for booking ${params.bookingId}`,
            idempotencyKey: `${params.idempotencyPrefix}:platform_credit`,
        },
        {
            type: client_1.LedgerEntryType.COMMISSION_REVERSAL, // Use as expense debit from platform
            debitAmount: params.commissionAmt,
            creditAmount: 0,
            description: `Commission expense (platform pays agent) for booking ${params.bookingId}`,
            idempotencyKey: `${params.idempotencyPrefix}:commission_expense`,
        },
    ];
    // Net check: debit = netFare + commissionAmt, credit = commissionAmt + netFare ✓
}
/**
 * Build wallet top-up ledger posting (wallet credit).
 */
function buildTopupLines(params) {
    return [
        {
            type: client_1.LedgerEntryType.AGENT_WALLET_TOPUP,
            debitAmount: 0,
            creditAmount: params.amount,
            description: `Wallet top-up ${params.topupId}`,
            idempotencyKey: `${params.idempotencyPrefix}:topup_credit`,
        },
        {
            type: client_1.LedgerEntryType.PLATFORM_REVENUE_CREDIT,
            debitAmount: params.amount,
            creditAmount: 0,
            description: `Top-up funds received from payment gateway for agent`,
            idempotencyKey: `${params.idempotencyPrefix}:topup_debit`,
        },
    ];
}
/**
 * Build cancellation refund ledger posting (wallet refund credit).
 */
function buildRefundLines(params) {
    const lines = [];
    if (params.refundAmount > 0) {
        lines.push({
            type: client_1.LedgerEntryType.REFUND_CREDIT,
            debitAmount: 0,
            creditAmount: params.refundAmount,
            description: `Refund credit for cancellation of booking ${params.bookingId}`,
            idempotencyKey: `${params.idempotencyPrefix}:refund_credit`,
        });
        lines.push({
            type: client_1.LedgerEntryType.PLATFORM_REVENUE_CREDIT,
            debitAmount: params.refundAmount,
            creditAmount: 0,
            description: `Platform refund expense for booking ${params.bookingId}`,
            idempotencyKey: `${params.idempotencyPrefix}:refund_debit`,
        });
    }
    if (params.commissionReversal > 0) {
        lines.push({
            type: client_1.LedgerEntryType.COMMISSION_REVERSAL,
            debitAmount: params.commissionReversal,
            creditAmount: 0,
            description: `Commission reversal for cancelled booking ${params.bookingId}`,
            idempotencyKey: `${params.idempotencyPrefix}:commission_reversal_debit`,
        });
        lines.push({
            type: client_1.LedgerEntryType.COMMISSION_CREDIT,
            debitAmount: 0,
            creditAmount: params.commissionReversal,
            description: `Commission clawback (platform recovers from agent) for booking ${params.bookingId}`,
            idempotencyKey: `${params.idempotencyPrefix}:commission_reversal_credit`,
        });
    }
    return lines;
}
//# sourceMappingURL=index.js.map