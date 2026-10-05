import { Queue, Worker, QueueEvents, Job, WorkerOptions } from 'bullmq';
import { createBullMQConnection } from '../redis';
import { env } from '../../config/env';
import { logger } from '../logger';
import { QueueName } from '../../shared/constants';

// ---------------------------------------------------------------------------
// BullMQ queue infrastructure — centralized creation and lifecycle
// ---------------------------------------------------------------------------

const queueLogger = logger.child({ module: 'queue' });

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();
const queueEvents = new Map<string, QueueEvents>();

/**
 * Get or create a BullMQ queue. Queues are singletons per name.
 */
export function getQueue(name: string): Queue {
  let queue = queues.get(name);
  if (!queue) {
    const connection = createBullMQConnection();
    queue = new Queue(name, {
      connection,
      prefix: env.BULL_PREFIX,
      defaultJobOptions: {
        removeOnComplete: { count: 1000, age: 24 * 3600 }, // Keep last 1000 or 24h
        removeOnFail: { count: 5000, age: 7 * 24 * 3600 }, // Keep failed for 7 days
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    queue.on('error', (err) => {
      queueLogger.error({ err, queue: name }, 'Queue error');
    });

    queues.set(name, queue);
    queueLogger.info({ queue: name }, 'Queue created');
  }
  return queue;
}

/**
 * Create a BullMQ worker for a queue.
 * Each worker gets its own Redis connection (BullMQ requirement).
 */
export function createWorker<T = unknown>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  options?: Partial<WorkerOptions>
): Worker<T> {
  const connection = createBullMQConnection();
  const worker = new Worker<T>(
    queueName,
    async (job) => {
      const workerLog = queueLogger.child({
        queue: queueName,
        jobId: job.id,
        jobName: job.name,
        attempt: job.attemptsMade + 1,
      });

      workerLog.info('Job started');
      const start = Date.now();

      try {
        await processor(job);
        workerLog.info({ durationMs: Date.now() - start }, 'Job completed');
      } catch (error) {
        workerLog.error(
          { err: error, durationMs: Date.now() - start },
          'Job failed'
        );
        throw error; // Let BullMQ handle retry
      }
    },
    {
      connection,
      prefix: env.BULL_PREFIX,
      concurrency: 5,
      ...options,
    }
  );

  worker.on('error', (err) => {
    queueLogger.error({ err, queue: queueName }, 'Worker error');
  });

  worker.on('failed', (job, err) => {
    queueLogger.error(
      { jobId: job?.id, jobName: job?.name, queue: queueName, err },
      'Job permanently failed (exhausted retries)'
    );
  });

  workers.set(queueName, worker);
  queueLogger.info({ queue: queueName }, 'Worker created');
  return worker;
}

/**
 * Initialize all application queues.
 */
export async function initializeQueues(): Promise<void> {
  const queueNames = Object.values(QueueName);
  for (const name of queueNames) {
    getQueue(name);
  }
  queueLogger.info({ count: queueNames.length }, 'All queues initialized');
}

/**
 * Gracefully shut down all workers and queues.
 */
export async function shutdownQueues(): Promise<void> {
  queueLogger.info('Shutting down queue infrastructure...');

  // Close workers first — stop processing new jobs
  const workerClosePromises = Array.from(workers.entries()).map(
    async ([name, worker]) => {
      try {
        await worker.close();
        queueLogger.info({ queue: name }, 'Worker closed');
      } catch (error) {
        queueLogger.error({ err: error, queue: name }, 'Failed to close worker');
      }
    }
  );
  await Promise.allSettled(workerClosePromises);

  // Close queue events
  const eventClosePromises = Array.from(queueEvents.entries()).map(
    async ([name, events]) => {
      try {
        await events.close();
      } catch (error) {
        queueLogger.error({ err: error, queue: name }, 'Failed to close queue events');
      }
    }
  );
  await Promise.allSettled(eventClosePromises);

  // Close queues
  const queueClosePromises = Array.from(queues.entries()).map(
    async ([name, queue]) => {
      try {
        await queue.close();
      } catch (error) {
        queueLogger.error({ err: error, queue: name }, 'Failed to close queue');
      }
    }
  );
  await Promise.allSettled(queueClosePromises);

  workers.clear();
  queueEvents.clear();
  queues.clear();
  queueLogger.info('Queue infrastructure shut down');
}

/**
 * Add a job to a queue.
 */
export async function addJob<T>(
  queueName: string,
  jobName: string,
  data: T,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
    backoff?: { type: 'exponential' | 'fixed'; delay: number };
    jobId?: string; // For idempotent jobs
  }
): Promise<Job<T> | null> {
  try {
    const queue = getQueue(queueName);
    const addPromise = queue.add(jobName, data, {
      delay: options?.delay,
      priority: options?.priority,
      attempts: options?.attempts,
      backoff: options?.backoff,
      jobId: options?.jobId,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Queue addJob timed out (Redis unavailable)')), 1000)
    );

    const job = await Promise.race([addPromise, timeoutPromise]);
    queueLogger.debug(
      { queue: queueName, jobId: job.id, jobName },
      'Job added'
    );
    return job;
  } catch (err: any) {
    queueLogger.warn(
      { queue: queueName, jobName, err: err.message },
      'Failed to enqueue job; continuing with degraded queue status'
    );
    return null;
  }
}
