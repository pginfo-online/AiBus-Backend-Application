export declare function paymentOutcome(bookingStatus: string, paymentStatus: string): "BOOKING_FAILED" | "BOOKING_UNKNOWN" | "PENDING" | "SUCCESS" | "FAILED";
export declare const settledPaymentStatuses: string[];
export declare function remainingPaymentStatus(paid: number, completedRefunds: number): "REFUNDED" | "PARTIALLY_REFUNDED";
//# sourceMappingURL=bookingOutcome.d.ts.map