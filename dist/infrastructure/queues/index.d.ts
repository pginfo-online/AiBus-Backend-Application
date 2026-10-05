import { Queue, Worker, Job, WorkerOptions } from 'bullmq';
/**
 * Get or create a BullMQ queue. Queues are singletons per name.
 */
export declare function getQueue(name: string): Queue;
/**
 * Create a BullMQ worker for a queue.
 * Each worker gets its own Redis connection (BullMQ requirement).
 */
export declare function createWorker<T = unknown>(queueName: string, processor: (job: Job<T>) => Promise<void>, options?: Partial<WorkerOptions>): Worker<T>;
/**
 * Initialize all application queues.
 */
export declare function initializeQueues(): Promise<void>;
/**
 * Gracefully shut down all workers and queues.
 */
export declare function shutdownQueues(): Promise<void>;
/**
 * Add a job to a queue.
 */
export declare function addJob<T>(queueName: string, jobName: string, data: T, options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
    backoff?: {
        type: 'exponential' | 'fixed';
        delay: number;
    };
    jobId?: string;
}): Promise<Job<T> | null>;
//# sourceMappingURL=index.d.ts.map