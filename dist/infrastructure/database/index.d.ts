import { PrismaClient } from '@prisma/client';
export declare function getPrismaClient(): PrismaClient;
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
/**
 * Health check — execute a simple query to verify connectivity.
 */
export declare function checkDatabaseHealth(): Promise<boolean>;
export { PrismaClient };
//# sourceMappingURL=index.d.ts.map