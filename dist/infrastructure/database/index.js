"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClient = void 0;
exports.getPrismaClient = getPrismaClient;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.checkDatabaseHealth = checkDatabaseHealth;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
const env_1 = require("../../config/env");
const logger_1 = require("../logger");
// ---------------------------------------------------------------------------
// Prisma client — singleton with logging and connection lifecycle
// ---------------------------------------------------------------------------
const prismaLogger = logger_1.logger.child({ module: 'prisma' });
let prisma;
function buildPrismaDatasourceUrl(rawUrl) {
    try {
        const parsed = new URL(rawUrl);
        // Configure connection limit if not explicitly set in DATABASE_URL
        if (!parsed.searchParams.has('connection_limit')) {
            parsed.searchParams.set('connection_limit', String(env_1.env.DATABASE_POOL_MAX));
        }
        // Configure pool timeout (seconds) if not set
        if (!parsed.searchParams.has('pool_timeout')) {
            parsed.searchParams.set('pool_timeout', '10');
        }
        // Configure connect timeout (seconds) if not set
        if (!parsed.searchParams.has('connect_timeout')) {
            parsed.searchParams.set('connect_timeout', '15');
        }
        return parsed.toString();
    }
    catch {
        // If URL parsing fails, fallback to rawUrl
        return rawUrl;
    }
}
function createPrismaClient() {
    const datasourceUrl = buildPrismaDatasourceUrl(env_1.env.DATABASE_URL);
    const client = new client_1.PrismaClient({
        datasourceUrl,
        log: [
            { level: 'query', emit: 'event' },
            { level: 'error', emit: 'event' },
            { level: 'warn', emit: 'event' },
        ],
    });
    // Log slow queries in development
    client.$on('query', (e) => {
        if (e.duration > 500) {
            prismaLogger.warn({ duration: e.duration, query: e.query }, 'Slow query detected');
        }
        else {
            prismaLogger.trace({ duration: e.duration, query: e.query }, 'Query executed');
        }
    });
    client.$on('error', (e) => {
        prismaLogger.error({ target: e.target, message: e.message }, 'Prisma error');
    });
    client.$on('warn', (e) => {
        prismaLogger.warn({ target: e.target, message: e.message }, 'Prisma warning');
    });
    return client;
}
function getPrismaClient() {
    if (!prisma) {
        prisma = createPrismaClient();
    }
    return prisma;
}
async function connectDatabase(maxRetries = 5, retryDelayMs = 1500) {
    const client = getPrismaClient();
    let attempt = 0;
    while (attempt < maxRetries) {
        attempt++;
        try {
            await client.$connect();
            // Verify connectivity with a quick query
            await client.$queryRaw `SELECT 1`;
            prismaLogger.info({ attempt }, 'Database connected and query verified successfully');
            return;
        }
        catch (error) {
            prismaLogger.warn({ attempt, maxRetries, err: error.message }, `Database connection attempt ${attempt}/${maxRetries} failed`);
            if (attempt >= maxRetries) {
                prismaLogger.fatal({ err: error }, 'Exhausted database connection retries (5 attempts)');
                throw error;
            }
            const backoff = retryDelayMs * Math.pow(1.5, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, backoff));
        }
    }
}
async function disconnectDatabase(timeoutMs = 5000) {
    if (prisma) {
        try {
            const client = prisma;
            const disconnectPromise = client.$disconnect();
            const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));
            await Promise.race([disconnectPromise, timeoutPromise]);
            prismaLogger.info('Database disconnected cleanly');
        }
        catch (err) {
            prismaLogger.error({ err }, 'Error disconnecting database');
        }
    }
}
/**
 * Health check — execute a simple query to verify connectivity with timeout.
 */
async function checkDatabaseHealth(timeoutMs = 3000) {
    try {
        const client = getPrismaClient();
        const queryPromise = client.$queryRaw `SELECT 1`;
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Database health check query timed out')), timeoutMs));
        await Promise.race([queryPromise, timeoutPromise]);
        return true;
    }
    catch (err) {
        prismaLogger.warn({ err: err.message }, 'Database health check failed');
        return false;
    }
}
//# sourceMappingURL=index.js.map