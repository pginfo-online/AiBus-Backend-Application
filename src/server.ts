import { createApp } from './app';
import { env } from './config/env';
import { logger } from './infrastructure/logger';
import { connectDatabase, disconnectDatabase } from './infrastructure/database';
import { connectRedis, disconnectRedis, isRedisAvailable } from './infrastructure/redis';
import { shutdownQueues } from './infrastructure/queues';
import { initializeWorkers } from './jobs';

// ---------------------------------------------------------------------------
// Server lifecycle management — bootstrap and graceful shutdown
// ---------------------------------------------------------------------------

const serverLogger = logger.child({ module: 'bootstrap' });

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
    serverLogger.info({ env: env.NODE_ENV, port: env.PORT, host: env.HOST }, 'Starting AiBus Backend...');

    // 1. Connect to Database with automatic 5 retries and pooling
    try {
      await connectDatabase(5, 1500);
      serverLogger.info('Database connection established and verified');
    } catch (dbErr) {
      serverLogger.fatal({ err: dbErr }, 'Database connection could not be established after 5 retries');
      if (env.NODE_ENV === 'production') {
        // Critical dependency failed in production: crash fast so supervisor/Render restarts
        process.exit(1);
      }
    }

    // 2. Connect to Redis (robust 5-retry strategy; degrades gracefully if unavailable)
    try {
      const redisConnected = await connectRedis(5);
      if (redisConnected) {
        serverLogger.info('Redis connected successfully; initializing background workers');
        initializeWorkers();
      } else {
        serverLogger.warn(
          'Redis is unavailable after 5 attempts; continuing in degraded mode (caching/queues disabled)'
        );
      }
    } catch (redisErr) {
      serverLogger.warn(
        { err: redisErr },
        'Redis connection failed; continuing in degraded mode'
      );
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

      // Force exit timeout to avoid hanging processes
      const forceExitTimer = setTimeout(() => {
        serverLogger.fatal('Forced shutdown timeout reached. Terminating process.');
        process.exit(1);
      }, env.SHUTDOWN_TIMEOUT_MS);
      forceExitTimer.unref();

      try {
        // 1. Stop accepting new HTTP requests and close idle keep-alive connections
        if ('closeIdleConnections' in server && typeof (server as any).closeIdleConnections === 'function') {
          (server as any).closeIdleConnections();
        }

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
