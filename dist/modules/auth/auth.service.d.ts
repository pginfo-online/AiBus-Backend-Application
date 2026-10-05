import { RegisterInput, LoginInput } from './auth.validation';
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
    private hashToken;
}
//# sourceMappingURL=auth.service.d.ts.map