import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../../infrastructure/database';
import { checkRedisHealth } from '../../infrastructure/redis';
import { logger } from '../../infrastructure/logger';

// ---------------------------------------------------------------------------
// Health check routes — liveness, readiness, detailed
// ---------------------------------------------------------------------------

const healthRouter = Router();

/**
 * GET /health/live
 * Liveness probe — is the process alive and able to handle requests?
 * Should NOT depend on external services.
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/ready
 * Readiness probe — can this instance safely receive traffic?
 * Checks critical dependency (database) and secondary dependency (Redis).
 * Returns 200 if critical database is operational (degraded if Redis is offline).
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  try {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    // Database is critical for business traffic
    const isReady = dbHealthy;

    const status = {
      status: isReady ? (redisHealthy ? 'ready' : 'degraded') : 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealthy ? 'ok' : 'failing',
        redis: redisHealthy ? 'ok' : 'unavailable',
      },
    };

    res.status(isReady ? 200 : 503).json(status);
  } catch (error) {
    logger.error({ err: error }, 'Readiness health check failed');
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
 * Returns 200 if operational (healthy/degraded), 503 if critical DB is down.
 */
healthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    const memUsage = process.memoryUsage();
    const isOperational = dbHealthy;

    const status = {
      status: dbHealthy && redisHealthy ? 'healthy' : isOperational ? 'degraded' : 'unhealthy',
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
          critical: true,
        },
        redis: {
          status: redisHealthy ? 'ok' : 'unavailable',
          critical: false,
        },
      },
    };

    res.status(isOperational ? 200 : 503).json(status);
  } catch (error) {
    logger.error({ err: error }, 'Detailed health check failed');
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
    });
  }
});

export { healthRouter };
export default healthRouter;
