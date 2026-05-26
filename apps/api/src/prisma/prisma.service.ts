import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../common/services/encryption.service';
import { buildEncryptionMiddleware } from '../common/middleware/prisma-encryption.middleware';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    @Optional() @Inject(EncryptionService) encryption?: EncryptionService,
  ) {
    super();
    if (encryption) {
      this.$use(buildEncryptionMiddleware(encryption));
      if (encryption.isEnabled()) {
        this.logger.log('Field-level encryption middleware enabled');
      }
    }
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (error) {
      this.logger.warn(
        'Could not connect to database. Ensure PostgreSQL is running and DATABASE_URL is set.',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
