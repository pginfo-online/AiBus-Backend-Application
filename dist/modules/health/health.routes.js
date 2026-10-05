"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const database_1 = require("../../infrastructure/database");
const redis_1 = require("../../infrastructure/redis");
const logger_1 = require("../../infrastructure/logger");
// ---------------------------------------------------------------------------
// Health check routes — liveness, readiness, detailed
// ---------------------------------------------------------------------------
const healthRouter = (0, express_1.Router)();
exports.healthRouter = healthRouter;
/**
 * GET /health/live
 * Liveness probe — is the process alive and able to handle requests?
 * Should NOT depend on external services.
 */
healthRouter.get('/live', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
/**
 * GET /health/ready
 * Readiness probe — can this instance safely receive traffic?
 * Checks critical dependencies (database, Redis).
 */
healthRouter.get('/ready', async (_req, res) => {
    try {
        const [dbHealthy, redisHealthy] = await Promise.all([
            (0, database_1.checkDatabaseHealth)(),
            (0, redis_1.checkRedisHealth)(),
        ]);
        const isReady = dbHealthy && redisHealthy;
        const status = {
            status: isReady ? 'ready' : 'not_ready',
            timestamp: new Date().toISOString(),
            checks: {
                database: dbHealthy ? 'ok' : 'failing',
                redis: redisHealthy ? 'ok' : 'failing',
            },
        };
        res.status(isReady ? 200 : 503).json(status);
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Health check failed');
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            checks: {
                database: 'unknown',
                redis: 'unknown',
            },
        });
    }
});
/**
 * GET /health
 * Detailed health — full dependency status with uptime and memory.
 */
healthRouter.get('/', async (_req, res) => {
    try {
        const [dbHealthy, redisHealthy] = await Promise.all([
            (0, database_1.checkDatabaseHealth)(),
            (0, redis_1.checkRedisHealth)(),
        ]);
        const memUsage = process.memoryUsage();
        const status = {
            status: dbHealthy && redisHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
            },
            checks: {
                database: {
                    status: dbHealthy ? 'ok' : 'failing',
                },
                redis: {
                    status: redisHealthy ? 'ok' : 'failing',
                },
            },
        };
        res.status(dbHealthy && redisHealthy ? 200 : 503).json(status);
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Detailed health check failed');
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
        });
    }
});
exports.default = healthRouter;
//# sourceMappingURL=health.routes.js.map