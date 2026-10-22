import axios from 'axios';
import { env, isTest } from '../../config/env';
import { logger } from '../../infrastructure/logger';
import { CircuitBreaker } from '../circuitBreaker';
import { AppError } from '../../shared/errors';

export interface SendOtpSmsOptions {
  to: string; // 10-digit Indian phone number (e.g. "8010097706")
  otp: string; // 4 to 6 digit OTP string
  appHash?: string; // 11-char Android SMS Retriever hash (e.g. "AbCdEfGhIjK")
}

export interface SmsSendResponse {
  success: boolean;
  messageId?: string;
  statusDesc?: string;
  simulated?: boolean;
}

export class DreamzSmsProvider {
  private static instance: DreamzSmsProvider;
  private readonly cb: CircuitBreaker;
  private readonly smsLogger = logger.child({ module: 'dreamz-sms-provider' });

  private constructor() {
    this.cb = new CircuitBreaker('DREAMZ_SMS', {
      failureThreshold: 3,
      failureWindowMs: 60000,
      resetTimeoutMs: 30000,
    });
  }

  public static getInstance(): DreamzSmsProvider {
    if (!DreamzSmsProvider.instance) {
      DreamzSmsProvider.instance = new DreamzSmsProvider();
    }
    return DreamzSmsProvider.instance;
  }

  /**
   * Masks a mobile phone number for secure production logging
   * e.g. "8010097706" -> "8010****06"
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return '******';
    return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
  }

  /**
   * Formats the DLT approved message according to the registered template:
   * "<#> Dear User, PGInfo login verification code is {#var#}. Valid for 5 minutes. Do not share. {#var#}"
   */
  public formatMessage(otp: string, appHash?: string): string {
    const hash = (appHash && appHash.trim()) || env.SMS_DEFAULT_APP_HASH;
    return `<#> Dear User, PGInfo login verification code is ${otp}. Valid for 5 minutes. Do not share. ${hash}`;
  }

  /**
   * Sends an OTP SMS via Dreamz Technology DLT Gateway
   */
  public async sendOtp(options: SendOtpSmsOptions): Promise<SmsSendResponse> {
    const { to, otp, appHash } = options;
    const cleanPhone = to.replace(/\D/g, '').slice(-10);

    if (cleanPhone.length !== 10) {
      throw new AppError({
        code: 'INVALID_PHONE_NUMBER',
        message: 'A valid 10-digit mobile number is required to send OTP',
        statusCode: 400,
      });
    }

    const message = this.formatMessage(otp, appHash);

    // If simulation enabled or running in test mode without live credentials
    if (env.SMS_SIMULATE || (isTest && !process.env.LIVE_SMS_TEST)) {
      this.smsLogger.info(
        { to: this.maskPhone(cleanPhone), simulated: true },
        'Simulated SMS OTP delivery'
      );
      return {
        success: true,
        messageId: `sim_${Date.now()}`,
        statusDesc: 'simulated_success',
        simulated: true,
      };
    }

    return this.cb.execute(async () => {
      try {
        const params = {
          mobile: env.SMS_GATEWAY_MOBILE,
          pass: env.SMS_GATEWAY_PASSWORD,
          to: cleanPhone,
          msg: message,
          peid: env.SMS_GATEWAY_PEID.trim(),
          templateid: env.SMS_GATEWAY_TEMPLATE_ID.trim(),
          restype: 'json',
          apikey: env.SMS_GATEWAY_APIKEY.trim(),
          senderid: env.SMS_GATEWAY_SENDER_ID.trim(),
        };

        this.smsLogger.info(
          { to: this.maskPhone(cleanPhone), senderId: env.SMS_GATEWAY_SENDER_ID },
          'Dispatching SMS OTP request to Dreamz gateway'
        );

        const response = await axios.get(env.SMS_GATEWAY_URL, {
          params,
          timeout: 8000,
          headers: {
            'User-Agent': 'AiBus-Backend-Auth/1.0',
          },
        });

        const data = response.data;
        // Gateway response format: {"status":"000","statusdesc":"success","messageid":"697541910"}
        const isSuccess = data?.status === '000' || (typeof data === 'string' && data.includes('success'));

        if (!isSuccess) {
          this.smsLogger.warn(
            { to: this.maskPhone(cleanPhone), gatewayStatus: data?.status, statusDesc: data?.statusdesc },
            'SMS gateway rejected message dispatch'
          );
          return {
            success: false,
            statusDesc: data?.statusdesc || 'Gateway delivery rejected',
          };
        }

        this.smsLogger.info(
          { to: this.maskPhone(cleanPhone), messageId: data?.messageid },
          'SMS OTP dispatched successfully via gateway'
        );

        return {
          success: true,
          messageId: data?.messageid,
          statusDesc: data?.statusdesc || 'success',
        };
      } catch (error: any) {
        this.smsLogger.error(
          { to: this.maskPhone(cleanPhone), error: error.message },
          'Failed to send SMS OTP via gateway'
        );
        throw new AppError({
          code: 'SMS_GATEWAY_ERROR',
          message: 'Unable to deliver OTP at this time. Please try again shortly.',
          statusCode: 502,
          cause: error,
        });
      }
    });
  }
}

export const dreamzSmsProvider = DreamzSmsProvider.getInstance();
