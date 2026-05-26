import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue-tokens';
import { JobSchedulerService } from './job-scheduler.service';
import { JobsAdminService } from './jobs-admin.service';
import { JobsAdminController } from './jobs-admin.controller';
import { PaymentTimeoutProcessor } from './processors/payment-timeout.processor';
import { AppointmentReminderProcessor } from './processors/appointment-reminder.processor';
import { VideoRoomCreationProcessor } from './processors/video-room-creation.processor';
import { SlotGenerationProcessor } from './processors/slot-generation.processor';
import { InvoiceGenerationProcessor } from './processors/invoice-generation.processor';
import { InvoiceService } from './invoice.service';
import { VideoModule } from '../video/video.module';
import { WhatsAppCoreModule } from '../whatsapp/whatsapp-core.module';
import { AuthModule } from '../../auth/auth.module';

const logger = new Logger('JobsModule');

/**
 * Parse the Redis URL into BullMQ ConnectionOptions. Returns null when no
 * REDIS_URL is set so the rest of the app can boot without Redis (graceful
 * degradation — JobSchedulerService logs and no-ops in that case).
 */
function parseRedisConnection(url: string | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      // BullMQ requires this set to null for blocking commands.
      maxRetriesPerRequest: null as null,
    };
  } catch (err) {
    logger.warn(`Invalid REDIS_URL: ${(err as Error).message}`);
    return null;
  }
}

const queueRegistrations = Object.values(QUEUE_NAMES).map((name) =>
  BullModule.registerQueue({ name }),
);

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        const connection = parseRedisConnection(url);
        if (!connection) {
          logger.warn(
            'REDIS_URL not set — background jobs disabled. Scheduler will no-op.',
          );
          // Return a connection block anyway; BullMQ will fail to actually
          // connect but the providers wire up. The scheduler checks
          // isEnabled() before adding work.
          return {
            connection: {
              host: '127.0.0.1',
              port: 6379,
              maxRetriesPerRequest: null as null,
              // Skip connecting at boot so we don't spam errors.
              lazyConnect: true,
              enableOfflineQueue: false,
            },
          };
        }
        return { connection };
      },
    }),
    ...queueRegistrations,
    AuthModule,
    WhatsAppCoreModule,
    VideoModule,
  ],
  controllers: [JobsAdminController],
  providers: [
    JobSchedulerService,
    JobsAdminService,
    InvoiceService,
    PaymentTimeoutProcessor,
    AppointmentReminderProcessor,
    VideoRoomCreationProcessor,
    SlotGenerationProcessor,
    InvoiceGenerationProcessor,
  ],
  exports: [JobSchedulerService],
})
export class JobsModule {}
