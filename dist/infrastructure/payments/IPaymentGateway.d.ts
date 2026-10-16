export type GatewayName = 'RAZORPAY' | 'PHONEPE';
export type PaymentMethodType = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'ALL';
export interface PaymentIntentParams {
    bookingId: string;
    bookingNumber: string;
    amount: number;
    currency: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    paymentMode?: PaymentMethodType;
    redirectUrl?: string;
    notes?: Record<string, string>;
    isTopup?: boolean;
    merchantTxnId?: string;
}
export interface PaymentIntentResult {
    gateway: GatewayName;
    merchantTxnId: string;
    gatewayOrderId: string;
    amount: number;
    currency: string;
    paymentUrl?: string;
    upiIntentUrl?: string;
    sdkPayload?: Record<string, unknown>;
    expiresAt?: Date;
}
export interface VerifyPaymentParams {
    merchantTxnId: string;
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    gatewaySignature?: string;
    rawBody?: string;
}
export interface PaymentVerificationResult {
    gateway: GatewayName;
    success: boolean;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    merchantTxnId: string;
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    amount?: number;
    paymentMethod?: string;
    bankTransactionId?: string;
    failureReason?: string;
}
export interface ProcessRefundParams {
    merchantRefundId: string;
    originalMerchantTxnId: string;
    gatewayPaymentId?: string;
    amount: number;
    reason?: string;
}
export interface RefundResult {
    gateway: GatewayName;
    success: boolean;
    gatewayRefundId?: string;
    code: string;
    message?: string;
}
export interface WebhookEventNormalized {
    gateway: GatewayName;
    eventId: string;
    eventType: string;
    merchantTxnId: string;
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    amount?: number;
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IGNORED';
    rawPayload: unknown;
}
export interface IPaymentGateway {
    readonly gatewayName: GatewayName;
    isConfigured(): boolean;
    createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult>;
    verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
    processRefund(params: ProcessRefundParams): Promise<RefundResult>;
    verifyWebhookSignature(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean;
    parseWebhookPayload(rawBody: string): WebhookEventNormalized;
}
//# sourceMappingURL=IPaymentGateway.d.ts.map