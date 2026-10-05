"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = bootstrap;
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./infrastructure/logger");
const database_1 = require("./infrastructure/database");
const redis_1 = require("./infrastructure/redis");
const queues_1 = require("./infrastructure/queues");
const jobs_1 = require("./jobs");
// ---------------------------------------------------------------------------
// Server lifecycle management — bootstrap and graceful shutdown
// ---------------------------------------------------------------------------
async function bootstrap() {
    const serverLogger = logger_1.logger.child({ module: 'bootstrap' });
    try {
        serverLogger.info({ env: env_1.env.NODE_ENV, port: env_1.env.PORT }, 'Starting AiBus Backend...');
        // 1. Connect to Database (gracefully handle initial connection in dev)
        try {
            await (0, database_1.connectDatabase)();
        }
        catch (dbErr) {
            serverLogger.warn({ err: dbErr }, 'Database connection could not be established immediately (will retry on query)');
        }
        // 2. Connect to Redis (gracefully handle in dev if redis offline)
        try {
            const redis = (0, redis_1.getRedisClient)();
            await redis.ping();
            serverLogger.info('Redis connected successfully');
            (0, jobs_1.initializeWorkers)();
        }
        catch (redisErr) {
            serverLogger.warn({ err: redisErr }, 'Redis connection could not be established immediately (will reconnect in background)');
        }
        // 3. Initialize Express application
        const app = (0, app_1.createApp)();
        // 4. Start HTTP server
        const server = app.listen(env_1.env.PORT, env_1.env.HOST, () => {
            serverLogger.info({ port: env_1.env.PORT, host: env_1.env.HOST, env: env_1.env.NODE_ENV }, `🚀 AiBus Backend running at http://${env_1.env.HOST}:${env_1.env.PORT}`);
        });
        // 5. Graceful shutdown handler
        let isShuttingDown = false;
        const gracefulShutdown = async (signal) => {
            if (isShuttingDown)
                return;
            isShuttingDown = true;
            serverLogger.info({ signal }, 'Graceful shutdown initiated...');
            // Force exit timeout
            const forceExitTimer = setTimeout(() => {
                serverLogger.fatal('Forced shutdown timeout reached. Terminating process.');
                process.exit(1);
            }, env_1.env.SHUTDOWN_TIMEOUT_MS);
            forceExitTimer.unref();
            try {
                // 1. Stop accepting new HTTP requests
                await new Promise((resolve, reject) => {
                    server.close((err) => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    });
                });
                serverLogger.info('HTTP server closed');
                // 2. Close BullMQ queues & workers
                await (0, queues_1.shutdownQueues)();
                serverLogger.info('Queue connections closed');
                // 3. Disconnect Redis
                await (0, redis_1.disconnectRedis)();
                serverLogger.info('Redis connection closed');
                // 4. Disconnect Database
                await (0, database_1.disconnectDatabase)();
                serverLogger.info('Database connection closed');
                serverLogger.info('Graceful shutdown completed successfully');
                clearTimeout(forceExitTimer);
                process.exit(0);
            }
            catch (err) {
                serverLogger.error({ err }, 'Error during graceful shutdown');
                process.exit(1);
            }
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('unhandledRejection', (reason, promise) => {
            serverLogger.error({ reason, promise }, 'Unhandled Promise Rejection detected');
        });
        process.on('uncaughtException', (error) => {
            serverLogger.fatal({ err: error }, 'Uncaught Exception detected');
            gracefulShutdown('uncaughtException');
        });
    }
    catch (error) {
        serverLogger.fatal({ err: error }, 'Failed to start server');
        process.exit(1);
    }
}
// Start server if executed directly
if (require.main === module) {
    bootstrap();
}
//# sourceMappingURL=server.js.map