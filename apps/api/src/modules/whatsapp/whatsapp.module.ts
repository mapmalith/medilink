import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppAdminController } from './whatsapp-admin.controller';
import { ConversationStateService } from './conversation-state.service';
import { WhatsAppCoreModule } from './whatsapp-core.module';
import { AppointmentsModule } from '../../appointments/appointments.module';
import { PaymentsModule } from '../../payments/payments.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    WhatsAppCoreModule,
    AuthModule,
    AppointmentsModule,
    PaymentsModule,
  ],
  controllers: [WhatsAppController, WhatsAppAdminController],
  providers: [ConversationStateService],
  exports: [WhatsAppCoreModule],
})
export class WhatsAppModule {}
