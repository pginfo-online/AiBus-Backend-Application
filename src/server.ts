import { createApp } from './app';
import { env } from './config/env';
import { logger } from './infrastructure/logger';
import { connectDatabase, disconnectDatabase } from './infrastructure/database';
import { getRedisClient, disconnectRedis } from './infrastructure/redis';
import { shutdownQueues } from './infrastructure/queues';
import { initializeWorkers } from './jobs';

// ---------------------------------------------------------------------------
// Server lifecycle management — bootstrap and graceful shutdown
// ---------------------------------------------------------------------------

async function bootstrap() {
  const serverLogger = logger.child({ module: 'bootstrap' });

  try {
    serverLogger.info({ env: env.NODE_ENV, port: env.PORT }, 'Starting AiBus Backend...');

    // 1. Connect to Database (gracefully handle initial connection in dev)
    try {
      await connectDatabase();
    } catch (dbErr) {
      serverLogger.warn({ err: dbErr }, 'Database connection could not be established immediately (will retry on query)');
    }

    // 2. Connect to Redis (gracefully handle in dev if redis offline)
    try {
      const redis = getRedisClient();
      await redis.ping();
      serverLogger.info('Redis connected successfully');
      initializeWorkers();
    } catch (redisErr) {
      serverLogger.warn({ err: redisErr }, 'Redis connection could not be established immediately (will reconnect in background)');
    }

    // 3. Initialize Express application
    const app = createApp();

    // 4. Start HTTP server
    const server = app.listen(env.PORT, env.HOST, () => {
      serverLogger.info(
        { port: env.PORT, host: env.HOST, env: env.NODE_ENV },
        `🚀 AiBus Backend running at http://${env.HOST}:${env.PORT}`
      );
    });

    // 5. Graceful shutdown handler
    let isShuttingDown = false;

    const gracefulShutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      serverLogger.info({ signal }, 'Graceful shutdown initiated...');

      // Force exit timeout
      const forceExitTimer = setTimeout(() => {
        serverLogger.fatal('Forced shutdown timeout reached. Terminating process.');
        process.exit(1);
      }, env.SHUTDOWN_TIMEOUT_MS);
      forceExitTimer.unref();

      try {
        // 1. Stop accepting new HTTP requests
        await new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        serverLogger.info('HTTP server closed');

        // 2. Close BullMQ queues & workers
        await shutdownQueues();
        serverLogger.info('Queue connections closed');

        // 3. Disconnect Redis
        await disconnectRedis();
        serverLogger.info('Redis connection closed');

        // 4. Disconnect Database
        await disconnectDatabase();
        serverLogger.info('Database connection closed');

        serverLogger.info('Graceful shutdown completed successfully');
        clearTimeout(forceExitTimer);
        process.exit(0);
      } catch (err) {
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
  } catch (error) {
    serverLogger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start server if executed directly
if (require.main === module) {
  bootstrap();
}

export { bootstrap };
