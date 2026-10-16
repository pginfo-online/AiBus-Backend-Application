import { IPaymentGateway, GatewayName, PaymentIntentParams, PaymentIntentResult, VerifyPaymentParams, PaymentVerificationResult, ProcessRefundParams, RefundResult, WebhookEventNormalized } from '../IPaymentGateway';
export declare class PhonePeAdapter implements IPaymentGateway {
    readonly gatewayName: GatewayName;
    private tokenCache;
    isConfigured(): boolean;
    private getAccessToken;
    createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult>;
    verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
    processRefund(params: ProcessRefundParams): Promise<RefundResult>;
    verifyWebhookSignature(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean;
    parseWebhookPayload(rawBody: string): WebhookEventNormalized;
}
//# sourceMappingURL=PhonePeAdapter.d.ts.map