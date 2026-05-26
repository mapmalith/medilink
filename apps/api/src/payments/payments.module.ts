import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsWebhookController } from './payments-webhook.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { AuthModule } from '../auth/auth.module';
import { WhatsAppCoreModule } from '../modules/whatsapp/whatsapp-core.module';
import { JobsModule } from '../modules/jobs/jobs.module';

@Module({
  imports: [AuthModule, WhatsAppCoreModule, JobsModule],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService, StripeService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
