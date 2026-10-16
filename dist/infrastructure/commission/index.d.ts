export interface BookingCommissionInput {
    agentId: string;
    grossFare: number;
    baseFare: number;
    operatorName?: string;
    fromCityId?: number;
    toCityId?: number;
    journeyDate: string;
}
export interface CommissionResult {
    ruleId: string | null;
    ruleSnapshot: object;
    grossFare: number;
    baseFareForCommission: number;
    commissionRate: number;
    commissionAmt: number;
    netFare: number;
}
/**
 * Resolves the applicable commission rule for a booking and computes amounts.
 * Returns commissionAmt=0 if no rule is active (log warning, not error).
 */
export declare function resolveCommission(input: BookingCommissionInput): Promise<CommissionResult>;
//# sourceMappingURL=index.d.ts.map