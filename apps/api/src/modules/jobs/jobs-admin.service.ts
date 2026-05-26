import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ALL_QUEUE_NAMES, QUEUE_NAMES, QueueName } from './queue-tokens';

const FAILED_LIMIT = 50;

@Injectable()
export class JobsAdminService {
  private readonly logger = new Logger(JobsAdminService.name);
  private readonly queues: Record<QueueName, Queue>;

  constructor(
    @InjectQueue(QUEUE_NAMES.PAYMENT_TIMEOUT) paymentTimeout: Queue,
    @InjectQueue(QUEUE_NAMES.APPOINTMENT_REMINDER) reminder: Queue,
    @InjectQueue(QUEUE_NAMES.VIDEO_ROOM_CREATION) video: Queue,
    @InjectQueue(QUEUE_NAMES.SLOT_GENERATION) slot: Queue,
    @InjectQueue(QUEUE_NAMES.INVOICE_GENERATION) invoice: Queue,
  ) {
    this.queues = {
      [QUEUE_NAMES.PAYMENT_TIMEOUT]: paymentTimeout,
      [QUEUE_NAMES.APPOINTMENT_REMINDER]: reminder,
      [QUEUE_NAMES.VIDEO_ROOM_CREATION]: video,
      [QUEUE_NAMES.SLOT_GENERATION]: slot,
      [QUEUE_NAMES.INVOICE_GENERATION]: invoice,
    };
  }

  /**
   * Per-queue counts for the dashboard cards. Returns zero counts and an
   * `available=false` flag when Redis is unreachable so the UI can render
   * gracefully.
   */
  async getQueueStats() {
    const out = [] as Array<{
      name: QueueName;
      available: boolean;
      counts: {
        active: number;
        waiting: number;
        delayed: number;
        completed: number;
        failed: number;
      };
    }>;

    for (const name of ALL_QUEUE_NAMES) {
      const queue = this.queues[name];
      try {
        const counts = await queue.getJobCounts(
          'active',
          'waiting',
          'delayed',
          'completed',
          'failed',
        );
        out.push({
          name,
          available: true,
          counts: {
            active: counts.active ?? 0,
            waiting: counts.waiting ?? 0,
            delayed: counts.delayed ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
          },
        });
      } catch (err) {
        this.logger.warn(
          `getJobCounts(${name}) failed: ${(err as Error).message}`,
        );
        out.push({
          name,
          available: false,
          counts: { active: 0, waiting: 0, delayed: 0, completed: 0, failed: 0 },
        });
      }
    }
    return out;
  }

  /**
   * List the most recent failed jobs across all queues. Returns up to
   * FAILED_LIMIT per queue.
   */
  async getFailedJobs() {
    const out: Array<{
      queue: QueueName;
      id: string;
      name: string;
      data: unknown;
      failedReason: string;
      attemptsMade: number;
      failedAt: number | null;
    }> = [];

    for (const name of ALL_QUEUE_NAMES) {
      const queue = this.queues[name];
      try {
        const jobs = await queue.getFailed(0, FAILED_LIMIT - 1);
        for (const job of jobs) {
          out.push({
            queue: name,
            id: job.id ?? '',
            name: job.name,
            data: job.data,
            failedReason: job.failedReason ?? 'Unknown error',
            attemptsMade: job.attemptsMade,
            failedAt: job.finishedOn ?? null,
          });
        }
      } catch (err) {
        this.logger.warn(
          `getFailed(${name}) failed: ${(err as Error).message}`,
        );
      }
    }
    out.sort((a, b) => (b.failedAt ?? 0) - (a.failedAt ?? 0));
    return out;
  }

  async retryJob(queueName: QueueName, jobId: string) {
    const queue = this.queues[queueName];
    if (!queue) throw new NotFoundException(`Unknown queue ${queueName}`);
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found in ${queueName}`);
    }
    await job.retry();
    return { queue: queueName, id: jobId, retried: true };
  }
}
