export interface SendOtpSmsOptions {
    to: string;
    otp: string;
    appHash?: string;
}
export interface SmsSendResponse {
    success: boolean;
    messageId?: string;
    statusDesc?: string;
    simulated?: boolean;
}
export declare class DreamzSmsProvider {
    private static instance;
    private readonly cb;
    private readonly smsLogger;
    private constructor();
    static getInstance(): DreamzSmsProvider;
    /**
     * Masks a mobile phone number for secure production logging
     * e.g. "8010097706" -> "8010****06"
     */
    private maskPhone;
    /**
     * Formats the DLT approved message according to the registered template:
     * "<#> Dear User, PGInfo login verification code is {#var#}. Valid for 5 minutes. Do not share. {#var#}"
     */
    formatMessage(otp: string, appHash?: string): string;
    /**
     * Sends an OTP SMS via Dreamz Technology DLT Gateway
     */
    sendOtp(options: SendOtpSmsOptions): Promise<SmsSendResponse>;
}
export declare const dreamzSmsProvider: DreamzSmsProvider;
//# sourceMappingURL=dreamzSms.provider.d.ts.map