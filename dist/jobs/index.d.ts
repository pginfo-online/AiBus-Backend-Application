/**
 * 1. Booking Reconciliation Worker
 * Resolves BOOKING_UNKNOWN states caused by network timeouts during BookSeats call
 */
export declare function startBookingReconciliationWorker(): import("bullmq").Worker<unknown, any, string, import("bullmq").RedisQueueBackend, import("bullmq").JobProgress, import("bullmq").ConnectionOptions>;
/**
 * 2. Hold Expiry Cleanup Worker
 * Releases seats and marks SeatHold expired after 10-minute TTL
 */
export declare function startHoldExpiryWorker(): import("bullmq").Worker<unknown, any, string, import("bullmq").RedisQueueBackend, import("bullmq").JobProgress, import("bullmq").ConnectionOptions>;
/**
 * 3. Refund Processing Worker
 * Dispatches refunds to payment gateway (Razorpay / PhonePe) and updates database records
 */
export declare function startRefundWorker(): import("bullmq").Worker<unknown, any, string, import("bullmq").RedisQueueBackend, import("bullmq").JobProgress, import("bullmq").ConnectionOptions>;
/**
 * 4. Notification Workers (Email & SMS)
 */
export declare function startNotificationWorkers(): import("bullmq").Worker<unknown, any, string, import("bullmq").RedisQueueBackend, import("bullmq").JobProgress, import("bullmq").ConnectionOptions>[];
/**
 * 5. Ticket Generation Worker
 * Generates branded PDF ticket and persists access URL
 */
export declare function startTicketGenerationWorker(): import("bullmq").Worker<unknown, any, string, import("bullmq").RedisQueueBackend, import("bullmq").JobProgress, import("bullmq").ConnectionOptions>;
/**
 * 6. Daily Ledger Reconciliation Worker
 * Audits all agent wallet cash balances against the sum of double-entry ledger journal postings
 * Emits alert logs whenever an un-reconciled discrepancy is detected
 */
export declare function startLedgerReconciliationWorker(): import("bullmq").Worker<unknown, any, string, import("bullmq").RedisQueueBackend, import("bullmq").JobProgress, import("bullmq").ConnectionOptions>;
export declare function scheduleDailyReconciliationJob(): Promise<void>;
/**
 * Initialize all application background workers
 */
export declare function initializeWorkers(): void;
//# sourceMappingURL=index.d.ts.map