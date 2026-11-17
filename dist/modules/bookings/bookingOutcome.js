"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settledPaymentStatuses = void 0;
exports.paymentOutcome = paymentOutcome;
exports.remainingPaymentStatus = remainingPaymentStatus;
function paymentOutcome(bookingStatus, paymentStatus) {
    if (bookingStatus === "CONFIRMED")
        return "SUCCESS";
    if (["BOOKING_FAILED", "REFUND_PENDING", "REFUNDED"].includes(bookingStatus))
        return "BOOKING_FAILED";
    if (bookingStatus === "BOOKING_UNKNOWN")
        return "BOOKING_UNKNOWN";
    if (["FAILED", "TIMED_OUT"].includes(paymentStatus))
        return "FAILED";
    return "PENDING";
}
exports.settledPaymentStatuses = [
    "SUCCESS",
    "PARTIALLY_REFUNDED",
    "REFUNDED",
];
function remainingPaymentStatus(paid, completedRefunds) {
    return Math.round(completedRefunds * 100) >= Math.round(paid * 100)
        ? "REFUNDED"
        : "PARTIALLY_REFUNDED";
}
//# sourceMappingURL=bookingOutcome.js.map