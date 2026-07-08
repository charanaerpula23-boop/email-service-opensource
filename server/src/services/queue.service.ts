import { logger } from '../utils/logger.js';

type JobHandler = (data: unknown) => Promise<void>;

interface Job {
  id: string;
  type: string;
  data: unknown;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  nextRetryAt?: Date;
}

interface QueueConfig {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  concurrency?: number;
}

const DEFAULT_CONFIG: Required<QueueConfig> = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  concurrency: 3,
};

class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<string, JobHandler> = new Map();
  private config: Required<QueueConfig>;
  private processing = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private jobCounter = 0;

  constructor(config?: QueueConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  registerHandler(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
    logger.info('Job handler registered', { jobType });
  }

  enqueue(jobType: string, data: unknown, maxAttempts?: number): string {
    const id = `job_${Date.now()}_${++this.jobCounter}`;
    const job: Job = {
      id,
      type: jobType,
      data,
      attempts: 0,
      maxAttempts: maxAttempts ?? this.config.maxAttempts,
      status: 'pending',
      createdAt: new Date(),
    };

    this.jobs.set(id, job);
    logger.info('Job enqueued', { jobId: id, type: jobType });

    // Attempt to process immediately
    void this.processNext();

    return id;
  }

  private async processNext(): Promise<void> {
    if (this.processing >= this.config.concurrency) {
      return;
    }

    const now = new Date();
    let nextJob: Job | undefined;

    for (const job of this.jobs.values()) {
      if (job.status !== 'pending') continue;
      if (job.nextRetryAt && job.nextRetryAt > now) continue;
      nextJob = job;
      break;
    }

    if (!nextJob) return;

    const handler = this.handlers.get(nextJob.type);
    if (!handler) {
      logger.error('No handler for job type', { type: nextJob.type });
      nextJob.status = 'failed';
      nextJob.error = `No handler registered for job type: ${nextJob.type}`;
      return;
    }

    this.processing++;
    nextJob.status = 'running';
    nextJob.attempts++;

    try {
      await handler(nextJob.data);
      nextJob.status = 'completed';
      logger.info('Job completed', {
        jobId: nextJob.id,
        type: nextJob.type,
        attempts: nextJob.attempts,
      });

      // Clean up completed jobs after a delay
      setTimeout(() => {
        this.jobs.delete(nextJob!.id);
      }, 30000);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      if (nextJob.attempts < nextJob.maxAttempts) {
        // Exponential backoff: baseDelay * 2^(attempt-1), capped at maxDelay
        const delay = Math.min(
          this.config.baseDelayMs * Math.pow(2, nextJob.attempts - 1),
          this.config.maxDelayMs
        );

        nextJob.status = 'pending';
        nextJob.nextRetryAt = new Date(Date.now() + delay);
        nextJob.error = errorMsg;

        logger.warn('Job failed, scheduling retry', {
          jobId: nextJob.id,
          type: nextJob.type,
          attempt: nextJob.attempts,
          maxAttempts: nextJob.maxAttempts,
          retryInMs: delay,
        });
      } else {
        nextJob.status = 'failed';
        nextJob.error = errorMsg;

        logger.error('Job permanently failed', {
          jobId: nextJob.id,
          type: nextJob.type,
          attempts: nextJob.attempts,
          error: errorMsg,
        });
      }
    } finally {
      this.processing--;
      // Try to process next job
      void this.processNext();
    }
  }

  start(): void {
    if (this.timer) return;

    // Poll for retry-eligible jobs every second
    this.timer = setInterval(() => {
      void this.processNext();
    }, 1000);

    logger.info('Job queue started');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('Job queue stopped');
    }
  }

  getJobStatus(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  getPendingCount(): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'pending') count++;
    }
    return count;
  }

  getStats(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } {
    const stats = { pending: 0, running: 0, completed: 0, failed: 0 };
    for (const job of this.jobs.values()) {
      stats[job.status]++;
    }
    return stats;
  }
}

// Singleton queue instance
export const queue = new JobQueue();

// Register built-in job types
export function registerDefaultHandlers(): void {
  queue.registerHandler('sendEmail', async (data) => {
    // Dynamic import to avoid circular dependencies
    const { EmailService } = await import('./email.service.js');
    const input = data as Parameters<typeof EmailService.sendEmail>[0];
    await EmailService.sendEmail(input);
  });

  queue.registerHandler('syncInbox', async (data) => {
    const { ImapService } = await import('./imap.service.js');
    const { userId } = data as { userId: string };
    await ImapService.syncInbox(userId);
  });

  queue.start();
  logger.info('Default job handlers registered and queue started');
}
