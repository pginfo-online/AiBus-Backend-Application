import crypto from 'crypto';
import axios from 'axios';
import { env, isDevelopment, isTest } from '../../../config/env';
import { logger } from '../../logger';
import {
  IPaymentGateway,
  GatewayName,
  PaymentIntentParams,
  PaymentIntentResult,
  VerifyPaymentParams,
  PaymentVerificationResult,
  ProcessRefundParams,
  RefundResult,
  WebhookEventNormalized,
} from '../IPaymentGateway';

const phonePeLogger = logger.child({ module: 'phonepe-adapter' });

const PHONEPE_OAUTH_URL =
  env.PHONEPE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';

const PHONEPE_CHECKOUT_BASE =
  env.PHONEPE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/pg'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const PHONEPE_API_BASE =
  env.PHONEPE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/hermes'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

interface PhonePeTokenCache {
  accessToken: string;
  expiresAt: number;
}

export class PhonePeAdapter implements IPaymentGateway {
  public readonly gatewayName: GatewayName = 'PHONEPE';
  private tokenCache: PhonePeTokenCache | null = null;

  public isConfigured(): boolean {
    return Boolean(
      env.PHONEPE_CLIENT_ID &&
      env.PHONEPE_CLIENT_SECRET &&
      env.PHONEPE_MERCHANT_ID
    );
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60000) {
      return this.tokenCache.accessToken;
    }

    const clientId = env.PHONEPE_CLIENT_ID || '';
    const clientSecret = env.PHONEPE_CLIENT_SECRET || '';
    const clientVersion = env.PHONEPE_CLIENT_VERSION || '1';

    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('client_version', clientVersion);
    params.append('grant_type', 'client_credentials');

    try {
      const res = await axios.post(PHONEPE_OAUTH_URL, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
      });
      const data = res.data;
      const expiresIn = Number(data.expires_in || 3600);
      this.tokenCache = {
        accessToken: data.access_token,
        expiresAt: now + expiresIn * 1000,
      };
      return this.tokenCache.accessToken;
    } catch (err: any) {
      phonePeLogger.error(
        { err: err.message, status: err.response?.status, data: err.response?.data },
        'PhonePe OAuth token generation failed'
      );
      if (isTest || isDevelopment) {
        return `MOCK-OAUTH-TOKEN-${Date.now()}`;
      }
      throw err;
    }
  }

  public async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
    const merchantTxnId = params.merchantTxnId || `TXN-AIB-${params.bookingNumber || 'BKG'}-${Date.now()}`;
    const amountInPaise = Math.round(params.amount * 100);

    const baseRedirect =
      params.redirectUrl ||
      env.PHONEPE_REDIRECT_URL ||
      'http://localhost:5173/payment-result';

    const redirectUrlWithParams = `${baseRedirect}${
      baseRedirect.includes('?') ? '&' : '?'
    }bookingId=${params.bookingId}&merchantTxnId=${merchantTxnId}`;

    if (this.isConfigured()) {
      try {
        const token = await this.getAccessToken();
        const checkoutUrl = `${PHONEPE_CHECKOUT_BASE}/checkout/v2/pay`;
        const payload: any = {
          merchantOrderId: merchantTxnId,
          amount: amountInPaise,
          expireAfter: 1200,
          paymentFlow: {
            type: 'PG_CHECKOUT',
            merchantUrls: {
              redirectUrl: redirectUrlWithParams,
            },
          },
        };

        if (params.paymentMode && params.paymentMode !== 'ALL') {
          payload.paymentFlow.paymentMode = {
            type: params.paymentMode,
          };
        }

        const res = await axios.post(checkoutUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `O-Bearer ${token}`,
          },
          timeout: 15000,
        });

        return {
          gateway: 'PHONEPE',
          merchantTxnId,
          gatewayOrderId: res.data.orderId,
          amount: params.amount,
          currency: params.currency || 'INR',
          paymentUrl: res.data.redirectUrl,
          upiIntentUrl: `phonepe://pay?tr=${merchantTxnId}&am=${params.amount}&cu=INR`,
          sdkPayload: res.data,
          expiresAt: new Date(Date.now() + 20 * 60 * 1000),
        };
      } catch (err: any) {
        phonePeLogger.error(
          { err: err.message, status: err.response?.status, data: err.response?.data },
          'PhonePe Checkout /v2/pay API call failed'
        );
        if (!isTest && !isDevelopment) {
          throw new Error(`PhonePe Checkout failed: ${err.message}`);
        }
      }
    }

    // Dev/Sandbox simulation fallback
    const mockOrderId = `OMO261015${Date.now()}`;
    return {
      gateway: 'PHONEPE',
      merchantTxnId,
      gatewayOrderId: mockOrderId,
      amount: params.amount,
      currency: params.currency || 'INR',
      paymentUrl: `${redirectUrlWithParams}&orderId=${mockOrderId}&state=PENDING`,
      upiIntentUrl: `phonepe://pay?tr=${merchantTxnId}&am=${params.amount}&cu=INR`,
      sdkPayload: { orderId: mockOrderId, state: 'PENDING' },
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
    };
  }

  public async verifyPayment(params: VerifyPaymentParams): Promise<PaymentVerificationResult> {
    const { merchantTxnId } = params;
    const merchantId = env.PHONEPE_MERCHANT_ID || 'MOCK_MERCHANT_ID';
    const saltKey = env.PHONEPE_CLIENT_SECRET || 'mock_salt';
    const saltIndex = env.PHONEPE_CLIENT_VERSION || '1';

    if (this.isConfigured()) {
      try {
        const endpoint = `/v3/transaction/${merchantId}/${merchantTxnId}/status`;
        const hash = crypto.createHash('sha256').update(endpoint + saltKey).digest('hex');
        const xVerify = `${hash}###${saltIndex}`;

        const res = await axios.get(`${PHONEPE_API_BASE}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': xVerify,
            'X-MERCHANT-ID': merchantId,
          },
          timeout: 10000,
        });

        const data = res.data;
        const code = data?.code;
        const isSuccess = data?.success === true || code === 'PAYMENT_SUCCESS';

        return {
          gateway: 'PHONEPE',
          success: isSuccess,
          status: isSuccess ? 'SUCCESS' : code === 'PAYMENT_PENDING' ? 'PENDING' : 'FAILED',
          merchantTxnId,
          gatewayOrderId: data?.data?.transactionId,
          gatewayPaymentId: data?.data?.providerReferenceId,
          amount: data?.data?.amount ? Number(data.data.amount) / 100 : undefined,
          failureReason: !isSuccess ? code : undefined,
        };
      } catch (err: any) {
        phonePeLogger.warn({ err: err.message, merchantTxnId }, 'PhonePe status check API failed');
        if (!isDevelopment && !isTest) {
          throw err;
        }
      }
    }

    // Dev/Test simulation return
    return {
      gateway: 'PHONEPE',
      success: true,
      status: 'SUCCESS',
      merchantTxnId,
      gatewayOrderId: `TXN_${Date.now()}`,
    };
  }

  public async processRefund(params: ProcessRefundParams): Promise<RefundResult> {
    const merchantId = env.PHONEPE_MERCHANT_ID || 'MOCK_MERCHANT_ID';
    const saltKey = env.PHONEPE_CLIENT_SECRET || 'mock_salt';
    const saltIndex = env.PHONEPE_CLIENT_VERSION || '1';

    const payload = {
      merchantId,
      merchantUserId: 'AIBUS_SYSTEM',
      originalTransactionId: params.originalMerchantTxnId,
      merchantTransactionId: params.merchantRefundId,
      amount: Math.round(params.amount * 100),
      callbackUrl: env.PHONEPE_CALLBACK_URL || '',
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const endpoint = '/v3/credit/backToSource';
    const hash = crypto
      .createHash('sha256')
      .update(base64Payload + endpoint + saltKey)
      .digest('hex');
    const xVerify = `${hash}###${saltIndex}`;

    try {
      const response = await axios.post(
        `${PHONEPE_API_BASE}${endpoint}`,
        { request: base64Payload },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': xVerify,
            'X-MERCHANT-ID': merchantId,
          },
          timeout: 15000,
        }
      );

      const data = response.data;
      return {
        gateway: 'PHONEPE',
        success: data?.success === true || data?.code === 'REFUND_SUCCESS',
        gatewayRefundId: data?.data?.transactionId,
        code: data?.code || 'UNKNOWN',
        message: data?.message,
      };
    } catch (err: any) {
      phonePeLogger.error({ err: err.message, merchantRefundId: params.merchantRefundId }, 'PhonePe refund failed');
      return {
        gateway: 'PHONEPE',
        success: isDevelopment || isTest,
        code: err.response?.data?.code || 'API_ERROR',
        message: err.message,
      };
    }
  }

  public verifyWebhookSignature(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ): boolean {
    const xVerify = headers['x-verify'];
    if (!xVerify || typeof xVerify !== 'string') {
      return isDevelopment || isTest;
    }

    const saltKey = env.PHONEPE_CLIENT_SECRET || '';
    const saltIndex = env.PHONEPE_CLIENT_VERSION || '1';
    const expectedHash = crypto.createHash('sha256').update(rawBody + saltKey).digest('hex');
    const expectedHeader = `${expectedHash}###${saltIndex}`;

    return xVerify === expectedHeader;
  }

  public parseWebhookPayload(rawBody: string): WebhookEventNormalized {
    let decoded: any;
    try {
      decoded = JSON.parse(Buffer.from(rawBody, 'base64').toString('utf-8'));
    } catch {
      decoded = JSON.parse(rawBody);
    }

    const code = decoded?.code;
    const data = decoded?.data;
    const merchantTxnId = data?.merchantTransactionId || data?.merchantOrderId || `TXN_${Date.now()}`;

    let status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'IGNORED' = 'PENDING';
    if (code === 'PAYMENT_SUCCESS') {
      status = 'SUCCESS';
    } else if (code === 'PAYMENT_ERROR' || code === 'PAYMENT_DECLINED' || code === 'TIMED_OUT') {
      status = 'FAILED';
    }

    return {
      gateway: 'PHONEPE',
      eventId: `wh_${merchantTxnId}_${Date.now()}`,
      eventType: code || 'PAYMENT_UPDATE',
      merchantTxnId,
      gatewayOrderId: data?.transactionId,
      gatewayPaymentId: data?.providerReferenceId,
      amount: data?.amount ? Number(data.amount) / 100 : undefined,
      status,
      rawPayload: decoded,
    };
  }
}
