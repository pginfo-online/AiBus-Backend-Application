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
const serverLogger = logger_1.logger.child({ module: 'bootstrap' });
// Global guards to catch and log unhandled exceptions and rejections
process.on('unhandledRejection', (reason, promise) => {
    serverLogger.error({ reason, promise }, 'Unhandled Promise Rejection detected');
});
process.on('uncaughtException', (error) => {
    serverLogger.fatal({ err: error }, 'Uncaught Exception detected');
    // Exit cleanly on uncaught exceptions
    process.exit(1);
});
async function bootstrap() {
    try {
        serverLogger.info({ env: env_1.env.NODE_ENV, port: env_1.env.PORT, host: env_1.env.HOST }, 'Starting AiBus Backend...');
        // 1. Connect to Database with automatic 5 retries and pooling
        try {
            await (0, database_1.connectDatabase)(5, 1500);
            serverLogger.info('Database connection established and verified');
        }
        catch (dbErr) {
            serverLogger.fatal({ err: dbErr }, 'Database connection could not be established after 5 retries');
            if (env_1.env.NODE_ENV === 'production') {
                // Critical dependency failed in production: crash fast so supervisor/Render restarts
                process.exit(1);
            }
        }
        // 2. Connect to Redis (robust 5-retry strategy; degrades gracefully if unavailable)
        try {
            const redisConnected = await (0, redis_1.connectRedis)(5);
            if (redisConnected) {
                serverLogger.info('Redis connected successfully; initializing background workers');
                (0, jobs_1.initializeWorkers)();
            }
            else {
                serverLogger.warn('Redis is unavailable after 5 attempts; continuing in degraded mode (caching/queues disabled)');
            }
        }
        catch (redisErr) {
            serverLogger.warn({ err: redisErr }, 'Redis connection failed; continuing in degraded mode');
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
            // Force exit timeout to avoid hanging processes
            const forceExitTimer = setTimeout(() => {
                serverLogger.fatal('Forced shutdown timeout reached. Terminating process.');
                process.exit(1);
            }, env_1.env.SHUTDOWN_TIMEOUT_MS);
            forceExitTimer.unref();
            try {
                // 1. Stop accepting new HTTP requests and close idle keep-alive connections
                if ('closeIdleConnections' in server && typeof server.closeIdleConnections === 'function') {
                    server.closeIdleConnections();
                }
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