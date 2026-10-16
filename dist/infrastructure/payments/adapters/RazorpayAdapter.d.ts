import { IPaymentGateway, GatewayName, PaymentIntentParams, PaymentIntentResult, VerifyPaymentParams, PaymentVerificationResult, ProcessRefundParams, RefundResult, WebhookEventNormalized } from '../IPaymentGateway';
export declare class RazorpayAdapter implements IPaymentGateway {
    readonly gatewayName: GatewayName;
    private client;
    constructor();
    private initClient;
    isConfigured(): boolean;
    /**
     * Create Razorpay Order
     * Generates order ID and prepares native SDK payload for Web & Mobile UPI Intent
     */
    createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult>;
    /**
     * Verify Razorpay Payment
     * Supports both cryptographic HMAC SHA256 signature verification and API fetch
     */
    verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
    /**
     * Process Refund via Razorpay API
     */
    processRefund(params: ProcessRefundParams): Promise<RefundResult>;
    /**
     * Webhook Signature Verification
     * Matches x-razorpay-signature header using HMAC SHA256
     */
    verifyWebhookSignature(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean;
    /**
     * Parse Razorpay Webhook Payload into unified structure
     */
    parseWebhookPayload(rawBody: string): WebhookEventNormalized;
}
//# sourceMappingURL=RazorpayAdapter.d.ts.map