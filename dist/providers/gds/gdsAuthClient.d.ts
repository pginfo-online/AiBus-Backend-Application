export declare class GdsAuthClient {
    private static instance;
    private readonly authLogger;
    private memoryToken;
    private memoryTokenExpiresAt;
    private constructor();
    static getInstance(): GdsAuthClient;
    getAccessToken(): Promise<string>;
    private fetchTokenFromUpstream;
}
//# sourceMappingURL=gdsAuthClient.d.ts.map