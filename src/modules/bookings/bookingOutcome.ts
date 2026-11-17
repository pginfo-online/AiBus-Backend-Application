export function paymentOutcome(bookingStatus: string, paymentStatus: string) {
  if (bookingStatus === "CONFIRMED") return "SUCCESS" as const;
  if (["BOOKING_FAILED", "REFUND_PENDING", "REFUNDED"].includes(bookingStatus))
    return "BOOKING_FAILED" as const;
  if (bookingStatus === "BOOKING_UNKNOWN") return "BOOKING_UNKNOWN" as const;
  if (["FAILED", "TIMED_OUT"].includes(paymentStatus)) return "FAILED" as const;
  return "PENDING" as const;
}
export const settledPaymentStatuses = [
  "SUCCESS",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
];
export function remainingPaymentStatus(paid: number, completedRefunds: number) {
  return Math.round(completedRefunds * 100) >= Math.round(paid * 100)
    ? ("REFUNDED" as const)
    : ("PARTIALLY_REFUNDED" as const);
}
