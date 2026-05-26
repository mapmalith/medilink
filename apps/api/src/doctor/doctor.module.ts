import { Module } from '@nestjs/common';
import { DoctorController } from './doctor.controller';
import { DoctorService } from './doctor.service';
import { AuthModule } from '../auth/auth.module';
import { WhatsAppCoreModule } from '../modules/whatsapp/whatsapp-core.module';
import { JobsModule } from '../modules/jobs/jobs.module';

@Module({
  imports: [AuthModule, WhatsAppCoreModule, JobsModule],
  controllers: [DoctorController],
  providers: [DoctorService],
})
export class DoctorModule {}
