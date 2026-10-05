"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueue = getQueue;
exports.createWorker = createWorker;
exports.initializeQueues = initializeQueues;
exports.shutdownQueues = shutdownQueues;
exports.addJob = addJob;
const bullmq_1 = require("bullmq");
const redis_1 = require("../redis");
const env_1 = require("../../config/env");
const logger_1 = require("../logger");
const constants_1 = require("../../shared/constants");
// ---------------------------------------------------------------------------
// BullMQ queue infrastructure — centralized creation and lifecycle
// ---------------------------------------------------------------------------
const queueLogger = logger_1.logger.child({ module: 'queue' });
const queues = new Map();
const workers = new Map();
const queueEvents = new Map();
/**
 * Get or create a BullMQ queue. Queues are singletons per name.
 */
function getQueue(name) {
    let queue = queues.get(name);
    if (!queue) {
        const connection = (0, redis_1.createBullMQConnection)();
        queue = new bullmq_1.Queue(name, {
            connection,
            prefix: env_1.env.BULL_PREFIX,
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
function createWorker(queueName, processor, options) {
    const connection = (0, redis_1.createBullMQConnection)();
    const worker = new bullmq_1.Worker(queueName, async (job) => {
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
        }
        catch (error) {
            workerLog.error({ err: error, durationMs: Date.now() - start }, 'Job failed');
            throw error; // Let BullMQ handle retry
        }
    }, {
        connection,
        prefix: env_1.env.BULL_PREFIX,
        concurrency: 5,
        ...options,
    });
    worker.on('error', (err) => {
        queueLogger.error({ err, queue: queueName }, 'Worker error');
    });
    worker.on('failed', (job, err) => {
        queueLogger.error({ jobId: job?.id, jobName: job?.name, queue: queueName, err }, 'Job permanently failed (exhausted retries)');
    });
    workers.set(queueName, worker);
    queueLogger.info({ queue: queueName }, 'Worker created');
    return worker;
}
/**
 * Initialize all application queues.
 */
async function initializeQueues() {
    const queueNames = Object.values(constants_1.QueueName);
    for (const name of queueNames) {
        getQueue(name);
    }
    queueLogger.info({ count: queueNames.length }, 'All queues initialized');
}
/**
 * Gracefully shut down all workers and queues.
 */
async function shutdownQueues() {
    queueLogger.info('Shutting down queue infrastructure...');
    // Close workers first — stop processing new jobs
    const workerClosePromises = Array.from(workers.entries()).map(async ([name, worker]) => {
        try {
            await worker.close();
            queueLogger.info({ queue: name }, 'Worker closed');
        }
        catch (error) {
            queueLogger.error({ err: error, queue: name }, 'Failed to close worker');
        }
    });
    await Promise.allSettled(workerClosePromises);
    // Close queue events
    const eventClosePromises = Array.from(queueEvents.entries()).map(async ([name, events]) => {
        try {
            await events.close();
        }
        catch (error) {
            queueLogger.error({ err: error, queue: name }, 'Failed to close queue events');
        }
    });
    await Promise.allSettled(eventClosePromises);
    // Close queues
    const queueClosePromises = Array.from(queues.entries()).map(async ([name, queue]) => {
        try {
            await queue.close();
        }
        catch (error) {
            queueLogger.error({ err: error, queue: name }, 'Failed to close queue');
        }
    });
    await Promise.allSettled(queueClosePromises);
    workers.clear();
    queueEvents.clear();
    queues.clear();
    queueLogger.info('Queue infrastructure shut down');
}
/**
 * Add a job to a queue.
 */
async function addJob(queueName, jobName, data, options) {
    try {
        const queue = getQueue(queueName);
        const addPromise = queue.add(jobName, data, {
            delay: options?.delay,
            priority: options?.priority,
            attempts: options?.attempts,
            backoff: options?.backoff,
            jobId: options?.jobId,
        });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Queue addJob timed out (Redis unavailable)')), 1000));
        const job = await Promise.race([addPromise, timeoutPromise]);
        queueLogger.debug({ queue: queueName, jobId: job.id, jobName }, 'Job added');
        return job;
    }
    catch (err) {
        queueLogger.warn({ queue: queueName, jobName, err: err.message }, 'Failed to enqueue job; continuing with degraded queue status');
        return null;
    }
}
//# sourceMappingURL=index.js.map