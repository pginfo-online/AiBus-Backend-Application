"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paise = void 0;
exports.cancellationRefund = cancellationRefund;
exports.splitRefund = splitRefund;
const paise = (value) => Math.round(value * 100);
exports.paise = paise;
function cancellationRefund(input) {
    if (Object.values(input).some((n) => !Number.isFinite(n) || n < 0) ||
        input.grossTotal <= 0 ||
        input.selectedGross > input.grossTotal ||
        input.operatorRefund > input.selectedGross + 0.01)
        throw new Error("Invalid refund financials");
    const selectedPaid = Math.round(((0, exports.paise)(input.paidTotal) * (0, exports.paise)(input.selectedGross)) /
        (0, exports.paise)(input.grossTotal));
    const operatorCharge = Math.max(0, (0, exports.paise)(input.selectedGross) - (0, exports.paise)(input.operatorRefund));
    return (Math.max(0, Math.min(selectedPaid - operatorCharge, (0, exports.paise)(input.paidTotal) - (0, exports.paise)(input.refunded))) / 100);
}
function splitRefund(amount, walletRemaining, gatewayRemaining) {
    const wallet = Math.min((0, exports.paise)(amount), (0, exports.paise)(walletRemaining));
    const gateway = (0, exports.paise)(amount) - wallet;
    if (wallet < 0 || gateway < 0 || gateway > (0, exports.paise)(gatewayRemaining))
        throw new Error("Refund exceeds collected funds");
    return { wallet: wallet / 100, gateway: gateway / 100 };
}
//# sourceMappingURL=refundMath.js.map