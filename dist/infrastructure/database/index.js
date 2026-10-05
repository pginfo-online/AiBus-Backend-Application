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
function createPrismaClient() {
    const client = new client_1.PrismaClient({
        datasourceUrl: env_1.env.DATABASE_URL,
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
async function connectDatabase() {
    const client = getPrismaClient();
    try {
        await client.$connect();
        prismaLogger.info('Database connected successfully');
    }
    catch (error) {
        prismaLogger.fatal({ err: error }, 'Failed to connect to database');
        throw error;
    }
}
async function disconnectDatabase() {
    if (prisma) {
        await prisma.$disconnect();
        prismaLogger.info('Database disconnected');
    }
}
/**
 * Health check — execute a simple query to verify connectivity.
 */
async function checkDatabaseHealth() {
    try {
        const client = getPrismaClient();
        await client.$queryRaw `SELECT 1`;
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=index.js.map