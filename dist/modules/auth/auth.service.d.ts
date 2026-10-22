import { RegisterInput, LoginInput, SendOtpInput, VerifyOtpInput } from './auth.validation';
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export declare class AuthService {
    private static instance;
    private constructor();
    static getInstance(): AuthService;
    register(input: RegisterInput): Promise<{
        user: any;
        tokens: AuthTokens;
    }>;
    login(input: LoginInput, deviceInfo?: string, ipAddress?: string): Promise<{
        user: any;
        tokens: AuthTokens;
    }>;
    refreshTokens(rawRefreshToken: string, deviceInfo?: string, ipAddress?: string): Promise<AuthTokens>;
    logout(rawRefreshToken: string): Promise<void>;
    private generateTokenPair;
    private memoryOtpStore;
    private memoryCooldownStore;
    private memoryCountStore;
    private hashOtp;
    private verifyHash;
    private generateNumericOtp;
    private getOtpRecord;
    private saveOtpRecord;
    private deleteOtpRecord;
    private incrementOtpAttempts;
    /**
     * Fast onboarding: Request OTP for a phone number
     */
    sendOtp(input: SendOtpInput, ipAddress?: string): Promise<{
        phone: string;
        otpLength: number;
        expiresInSeconds: number;
        resendCooldownSeconds: number;
        debugOtp?: string;
    }>;
    /**
     * Fast onboarding: Verify OTP and log in / auto-register user
     */
    verifyOtp(input: VerifyOtpInput, deviceInfo?: string, ipAddress?: string): Promise<{
        user: any;
        tokens: AuthTokens;
        isNewUser: boolean;
    }>;
    private hashToken;
}
//# sourceMappingURL=auth.service.d.ts.map