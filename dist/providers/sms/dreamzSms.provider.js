"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dreamzSmsProvider = exports.DreamzSmsProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../config/env");
const logger_1 = require("../../infrastructure/logger");
const circuitBreaker_1 = require("../circuitBreaker");
const errors_1 = require("../../shared/errors");
class DreamzSmsProvider {
    static instance;
    cb;
    smsLogger = logger_1.logger.child({ module: 'dreamz-sms-provider' });
    constructor() {
        this.cb = new circuitBreaker_1.CircuitBreaker('DREAMZ_SMS', {
            failureThreshold: 3,
            failureWindowMs: 60000,
            resetTimeoutMs: 30000,
        });
    }
    static getInstance() {
        if (!DreamzSmsProvider.instance) {
            DreamzSmsProvider.instance = new DreamzSmsProvider();
        }
        return DreamzSmsProvider.instance;
    }
    /**
     * Masks a mobile phone number for secure production logging
     * e.g. "8010097706" -> "8010****06"
     */
    maskPhone(phone) {
        if (!phone || phone.length < 6)
            return '******';
        return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
    }
    /**
     * Formats the DLT approved message according to the registered template:
     * "<#> Dear User, PGInfo login verification code is {#var#}. Valid for 5 minutes. Do not share. {#var#}"
     */
    formatMessage(otp, appHash) {
        const hash = (appHash && appHash.trim()) || env_1.env.SMS_DEFAULT_APP_HASH;
        return `<#> Dear User, PGInfo login verification code is ${otp}. Valid for 5 minutes. Do not share. ${hash}`;
    }
    /**
     * Sends an OTP SMS via Dreamz Technology DLT Gateway
     */
    async sendOtp(options) {
        const { to, otp, appHash } = options;
        const cleanPhone = to.replace(/\D/g, '').slice(-10);
        if (cleanPhone.length !== 10) {
            throw new errors_1.AppError({
                code: 'INVALID_PHONE_NUMBER',
                message: 'A valid 10-digit mobile number is required to send OTP',
                statusCode: 400,
            });
        }
        const message = this.formatMessage(otp, appHash);
        // If simulation enabled or running in test mode without live credentials
        if (env_1.env.SMS_SIMULATE || (env_1.isTest && !process.env.LIVE_SMS_TEST)) {
            this.smsLogger.info({ to: this.maskPhone(cleanPhone), simulated: true }, 'Simulated SMS OTP delivery');
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
                    mobile: env_1.env.SMS_GATEWAY_MOBILE,
                    pass: env_1.env.SMS_GATEWAY_PASSWORD,
                    to: cleanPhone,
                    msg: message,
                    peid: env_1.env.SMS_GATEWAY_PEID.trim(),
                    templateid: env_1.env.SMS_GATEWAY_TEMPLATE_ID.trim(),
                    restype: 'json',
                    apikey: env_1.env.SMS_GATEWAY_APIKEY.trim(),
                    senderid: env_1.env.SMS_GATEWAY_SENDER_ID.trim(),
                };
                this.smsLogger.info({ to: this.maskPhone(cleanPhone), senderId: env_1.env.SMS_GATEWAY_SENDER_ID }, 'Dispatching SMS OTP request to Dreamz gateway');
                const response = await axios_1.default.get(env_1.env.SMS_GATEWAY_URL, {
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
                    this.smsLogger.warn({ to: this.maskPhone(cleanPhone), gatewayStatus: data?.status, statusDesc: data?.statusdesc }, 'SMS gateway rejected message dispatch');
                    return {
                        success: false,
                        statusDesc: data?.statusdesc || 'Gateway delivery rejected',
                    };
                }
                this.smsLogger.info({ to: this.maskPhone(cleanPhone), messageId: data?.messageid }, 'SMS OTP dispatched successfully via gateway');
                return {
                    success: true,
                    messageId: data?.messageid,
                    statusDesc: data?.statusdesc || 'success',
                };
            }
            catch (error) {
                this.smsLogger.error({ to: this.maskPhone(cleanPhone), error: error.message }, 'Failed to send SMS OTP via gateway');
                throw new errors_1.AppError({
                    code: 'SMS_GATEWAY_ERROR',
                    message: 'Unable to deliver OTP at this time. Please try again shortly.',
                    statusCode: 502,
                    cause: error,
                });
            }
        });
    }
}
exports.DreamzSmsProvider = DreamzSmsProvider;
exports.dreamzSmsProvider = DreamzSmsProvider.getInstance();
//# sourceMappingURL=dreamzSms.provider.js.map