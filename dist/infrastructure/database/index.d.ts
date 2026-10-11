import { PrismaClient } from '@prisma/client';
export declare function getPrismaClient(): PrismaClient;
export declare function connectDatabase(maxRetries?: number, retryDelayMs?: number): Promise<void>;
export declare function disconnectDatabase(timeoutMs?: number): Promise<void>;
/**
 * Health check — execute a simple query to verify connectivity with timeout.
 */
export declare function checkDatabaseHealth(timeoutMs?: number): Promise<boolean>;
export { PrismaClient };
//# sourceMappingURL=index.d.ts.map