export declare class GdsAuthClient {
    private static instance;
    private readonly authLogger;
    private refreshing?;
    private memoryToken;
    private memoryTokenExpiresAt;
    private constructor();
    static getInstance(): GdsAuthClient;
    getAccessToken(): Promise<string>;
    private refresh;
    private fetchTokenFromUpstream;
}
//# sourceMappingURL=gdsAuthClient.d.ts.map