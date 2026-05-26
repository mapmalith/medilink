import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuditModule } from './audit/audit.module';
import { DoctorModule } from './doctor/doctor.module';
import { DrugsModule } from './drugs/drugs.module';
import { GdprModule } from './gdpr/gdpr.module';
import { HotelModule } from './hotel/hotel.module';
import { PatientsModule } from './patients/patients.module';
import { PaymentsModule } from './payments/payments.module';
import { QrCodesModule } from './qr-codes/qr-codes.module';
import { VideoModule } from './modules/video/video.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    ThrottlerModule.forRoot([
      // Default global limit: 100 req/min/IP. Named throttlers below
      // ('auth', 'public') stack on top via @Throttle() per-route.
      { name: 'default', ttl: 60_000, limit: 100 },
      { name: 'auth', ttl: 60_000, limit: 5 },
      { name: 'public', ttl: 60_000, limit: 30 },
    ]),
    CommonModule,
    PrismaModule,
    AuthModule,
    AdminModule,
    AppointmentsModule,
    AuditModule,
    DoctorModule,
    DrugsModule,
    GdprModule,
    HotelModule,
    PatientsModule,
    PaymentsModule,
    QrCodesModule,
    VideoModule,
    WhatsAppModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
