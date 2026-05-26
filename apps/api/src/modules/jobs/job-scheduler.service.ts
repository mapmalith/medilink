import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import {
  QUEUE_NAMES,
  SLOT_GENERATION_REPEAT_KEY,
} from './queue-tokens';

const PAYMENT_TIMEOUT_DEFAULT_MIN = 60;

/**
 * Public API for scheduling background jobs from other modules. Wraps
 * BullMQ queues and is a no-op when REDIS_URL is not set so the app
 * still works locally without Redis.
 */
@Injectable()
export class JobSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(JobSchedulerService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.PAYMENT_TIMEOUT) private readonly paymentTimeoutQ: Queue,
    @InjectQueue(QUEUE_NAMES.APPOINTMENT_REMINDER) private readonly reminderQ: Queue,
    @InjectQueue(QUEUE_NAMES.VIDEO_ROOM_CREATION) private readonly videoQ: Queue,
    @InjectQueue(QUEUE_NAMES.SLOT_GENERATION) private readonly slotQ: Queue,
    @InjectQueue(QUEUE_NAMES.INVOICE_GENERATION) private readonly invoiceQ: Queue,
  ) {
    this.enabled = !!this.config.get<string>('REDIS_URL');
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn(
        'REDIS_URL not set — JobSchedulerService is disabled (no-op).',
      );
      return;
    }

    // Daily 2 AM cron for slot generation.
    try {
      await this.slotQ.add(
        'daily-slot-generation',
        {},
        {
          jobId: SLOT_GENERATION_REPEAT_KEY,
          repeat: { pattern: '0 2 * * *' },
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );

      // Run once on startup so dev DBs have slots immediately.
      await this.slotQ.add(
        'initial-slot-generation',
        {},
        { removeOnComplete: true, removeOnFail: 100 },
      );

      this.logger.log(
        'Slot-generation cron scheduled (daily 02:00 UTC + initial run).',
      );
    } catch (err) {
      this.logger.error(
        `Failed to schedule slot-generation cron: ${(err as Error).message}`,
      );
    }
  }

  isEnabled() {
    return this.enabled;
  }

  // ─── Payment timeout ────────────────────────────────────────────────────

  async schedulePaymentTimeout(appointmentId: string, delayMs?: number) {
    if (!this.enabled) return;
    const delay = delayMs ?? (await this.resolvePaymentTimeoutMs());
    try {
      await this.paymentTimeoutQ.add(
        `payment-timeout:${appointmentId}`,
        { appointmentId },
        {
          jobId: this.paymentTimeoutJobId(appointmentId),
          delay,
          removeOnComplete: true,
          removeOnFail: 100,
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
        },
      );
      this.logger.log(
        `Scheduled payment timeout for ${appointmentId} in ${delay}ms`,
      );
    } catch (err) {
      this.logger.error(
        `schedulePaymentTimeout(${appointmentId}) failed: ${(err as Error).message}`,
      );
    }
  }

  // ─── Reminder ───────────────────────────────────────────────────────────

  async scheduleReminder(appointmentId: string, scheduledTime: Date) {
    if (!this.enabled) return;
    const delay = scheduledTime.getTime() - 2 * 60 * 60 * 1000 - Date.now();
    if (delay <= 0) {
      this.logger.debug(
        `Skipping reminder for ${appointmentId} — already within 2h window`,
      );
      return;
    }
    try {
      await this.reminderQ.add(
        `reminder:${appointmentId}`,
        { appointmentId },
        {
          jobId: this.reminderJobId(appointmentId),
          delay,
          removeOnComplete: true,
          removeOnFail: 100,
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
        },
      );
      this.logger.log(
        `Scheduled 2hr reminder for ${appointmentId} in ${delay}ms`,
      );
    } catch (err) {
      this.logger.error(
        `scheduleReminder(${appointmentId}) failed: ${(err as Error).message}`,
      );
    }
  }

  // ─── Video room ─────────────────────────────────────────────────────────

  async scheduleVideoRoomCreation(appointmentId: string, scheduledTime: Date) {
    if (!this.enabled) return;
    const delay = scheduledTime.getTime() - 10 * 60 * 1000 - Date.now();
    const effectiveDelay = Math.max(delay, 0);
    try {
      await this.videoQ.add(
        `video-room:${appointmentId}`,
        { appointmentId },
        {
          jobId: this.videoJobId(appointmentId),
          delay: effectiveDelay,
          removeOnComplete: true,
          removeOnFail: 100,
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
        },
      );
      this.logger.log(
        `Scheduled video room creation for ${appointmentId} in ${effectiveDelay}ms`,
      );
    } catch (err) {
      this.logger.error(
        `scheduleVideoRoomCreation(${appointmentId}) failed: ${(err as Error).message}`,
      );
    }
  }

  // ─── Invoice ────────────────────────────────────────────────────────────

  async scheduleInvoiceGeneration(appointmentId: string) {
    if (!this.enabled) return;
    try {
      await this.invoiceQ.add(
        `invoice:${appointmentId}`,
        { appointmentId },
        {
          jobId: this.invoiceJobId(appointmentId),
          removeOnComplete: true,
          removeOnFail: 100,
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
        },
      );
      this.logger.log(`Scheduled invoice generation for ${appointmentId}`);
    } catch (err) {
      this.logger.error(
        `scheduleInvoiceGeneration(${appointmentId}) failed: ${(err as Error).message}`,
      );
    }
  }

  // ─── Cancellation / reschedule ──────────────────────────────────────────

  async cancelJobsForAppointment(appointmentId: string) {
    if (!this.enabled) return;
    const jobIds = [
      [this.paymentTimeoutQ, this.paymentTimeoutJobId(appointmentId)],
      [this.reminderQ, this.reminderJobId(appointmentId)],
      [this.videoQ, this.videoJobId(appointmentId)],
      [this.invoiceQ, this.invoiceJobId(appointmentId)],
    ] as const;

    for (const [queue, jobId] of jobIds) {
      try {
        const job = await queue.getJob(jobId);
        if (job) {
          await job.remove();
        }
      } catch (err) {
        this.logger.warn(
          `Failed to remove ${jobId}: ${(err as Error).message}`,
        );
      }
    }
  }

  async rescheduleJobsForAppointment(
    appointmentId: string,
    newScheduledTime: Date,
    appointmentType?: string,
  ) {
    if (!this.enabled) return;
    await this.cancelJobsForAppointment(appointmentId);
    await this.scheduleReminder(appointmentId, newScheduledTime);
    if (appointmentType === 'TELE_CONSULTATION') {
      await this.scheduleVideoRoomCreation(appointmentId, newScheduledTime);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private paymentTimeoutJobId(id: string) {
    return `payment-timeout:${id}`;
  }
  private reminderJobId(id: string) {
    return `reminder:${id}`;
  }
  private videoJobId(id: string) {
    return `video-room:${id}`;
  }
  private invoiceJobId(id: string) {
    return `invoice:${id}`;
  }

  private async resolvePaymentTimeoutMs(): Promise<number> {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: 'teleconsult_payment_timeout_minutes' },
    });
    const minutes = row ? parseInt(row.value, 10) : NaN;
    const safe = Number.isFinite(minutes) ? minutes : PAYMENT_TIMEOUT_DEFAULT_MIN;
    return safe * 60 * 1000;
  }
}
