import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AuthModule } from '../auth/auth.module';
import { WhatsAppCoreModule } from '../modules/whatsapp/whatsapp-core.module';
import { JobsModule } from '../modules/jobs/jobs.module';

@Module({
  imports: [AuthModule, WhatsAppCoreModule, JobsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
