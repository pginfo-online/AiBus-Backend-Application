// ---------------------------------------------------------------------------
// Universal Payment Gateway Interface & Types (AiBus Payment Orchestrator)
// ---------------------------------------------------------------------------

export type GatewayName = 'RAZORPAY' | 'PHONEPE';
export type PaymentMethodType = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'ALL';

export interface PaymentIntentParams {
  bookingId: string;
  bookingNumber: string;
  amount: number; // In INR (e.g. 1250.50)
  currency: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  paymentMode?: PaymentMethodType;
  redirectUrl?: string;
  notes?: Record<string, string>;
  isTopup?: boolean;
}

export interface PaymentIntentResult {
  gateway: GatewayName;
  merchantTxnId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  paymentUrl?: string;       // Web checkout URL or deep link
  upiIntentUrl?: string;     // upi://pay URL for native app launch
  sdkPayload?: Record<string, unknown>; // Client SDK parameters (Razorpay options / PhonePe payload)
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
  amount: number; // In INR
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
  createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult>;
  processRefund(params: ProcessRefundParams): Promise<RefundResult>;
  verifyWebhookSignature(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean;
  parseWebhookPayload(rawBody: string): WebhookEventNormalized;
}
