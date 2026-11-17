export const paise = (value: number) => Math.round(value * 100);
export function cancellationRefund(input: {
  grossTotal: number;
  selectedGross: number;
  paidTotal: number;
  operatorRefund: number;
  refunded: number;
}) {
  if (
    Object.values(input).some((n) => !Number.isFinite(n) || n < 0) ||
    input.grossTotal <= 0 ||
    input.selectedGross > input.grossTotal ||
    input.operatorRefund > input.selectedGross + 0.01
  )
    throw new Error("Invalid refund financials");
  const selectedPaid = Math.round(
    (paise(input.paidTotal) * paise(input.selectedGross)) /
      paise(input.grossTotal),
  );
  const operatorCharge = Math.max(
    0,
    paise(input.selectedGross) - paise(input.operatorRefund),
  );
  return (
    Math.max(
      0,
      Math.min(
        selectedPaid - operatorCharge,
        paise(input.paidTotal) - paise(input.refunded),
      ),
    ) / 100
  );
}
export function splitRefund(
  amount: number,
  walletRemaining: number,
  gatewayRemaining: number,
) {
  const wallet = Math.min(paise(amount), paise(walletRemaining));
  const gateway = paise(amount) - wallet;
  if (wallet < 0 || gateway < 0 || gateway > paise(gatewayRemaining))
    throw new Error("Refund exceeds collected funds");
  return { wallet: wallet / 100, gateway: gateway / 100 };
}
