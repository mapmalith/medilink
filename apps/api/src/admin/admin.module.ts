import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminPricingController } from './admin-pricing.controller';
import { AdminPricingService } from './admin-pricing.service';
import { AdminDoctorsController } from './admin-doctors.controller';
import { AdminDoctorsService } from './admin-doctors.service';
import { AdminHotelsController } from './admin-hotels.controller';
import { AdminHotelsService } from './admin-hotels.service';
import { AdminQRCodesController } from './admin-qr-codes.controller';
import { AdminPatientsController } from './admin-patients.controller';
import { AdminPatientsService } from './admin-patients.service';
import { AdminDrugsController } from './admin-drugs.controller';
import { AdminDrugsService } from './admin-drugs.service';
import { AdminStaffController } from './admin-staff.controller';
import { AdminStaffService } from './admin-staff.service';
import { AdminConfigController } from './admin-config.controller';
import { AdminConfigService } from './admin-config.service';
import { AdminAppointmentsController } from './admin-appointments.controller';
import { AdminAppointmentsService } from './admin-appointments.service';
import { AuthModule } from '../auth/auth.module';
import { WhatsAppCoreModule } from '../modules/whatsapp/whatsapp-core.module';
import { JobsModule } from '../modules/jobs/jobs.module';

@Module({
  imports: [AuthModule, WhatsAppCoreModule, JobsModule],
  controllers: [
    AdminDashboardController,
    AdminPricingController,
    AdminDoctorsController,
    AdminHotelsController,
    AdminQRCodesController,
    AdminPatientsController,
    AdminDrugsController,
    AdminStaffController,
    AdminConfigController,
    AdminAppointmentsController,
  ],
  providers: [
    AdminDashboardService,
    AdminPricingService,
    AdminDoctorsService,
    AdminHotelsService,
    AdminPatientsService,
    AdminDrugsService,
    AdminStaffService,
    AdminConfigService,
    AdminAppointmentsService,
  ],
})
export class AdminModule {}
