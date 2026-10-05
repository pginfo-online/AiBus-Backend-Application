import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../logger';

// ---------------------------------------------------------------------------
// Prisma client — singleton with logging and connection lifecycle
// ---------------------------------------------------------------------------

const prismaLogger = logger.child({ module: 'prisma' });

let prisma: PrismaClient;

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });

  // Log slow queries in development
  client.$on('query', (e) => {
    if (e.duration > 500) {
      prismaLogger.warn(
        { duration: e.duration, query: e.query },
        'Slow query detected'
      );
    } else {
      prismaLogger.trace(
        { duration: e.duration, query: e.query },
        'Query executed'
      );
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

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = createPrismaClient();
  }
  return prisma;
}

export async function connectDatabase(): Promise<void> {
  const client = getPrismaClient();
  try {
    await client.$connect();
    prismaLogger.info('Database connected successfully');
  } catch (error) {
    prismaLogger.fatal({ err: error }, 'Failed to connect to database');
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prismaLogger.info('Database disconnected');
  }
}

/**
 * Health check — execute a simple query to verify connectivity.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export { PrismaClient };
