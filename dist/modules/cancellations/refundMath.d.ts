export declare const paise: (value: number) => number;
export declare function cancellationRefund(input: {
    grossTotal: number;
    selectedGross: number;
    paidTotal: number;
    operatorRefund: number;
    refunded: number;
}): number;
export declare function splitRefund(amount: number, walletRemaining: number, gatewayRemaining: number): {
    wallet: number;
    gateway: number;
};
//# sourceMappingURL=refundMath.d.ts.map