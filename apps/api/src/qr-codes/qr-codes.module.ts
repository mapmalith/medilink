import { Module } from '@nestjs/common';
import { QrCodesController } from './qr-codes.controller';
import { QrCodesService } from './qr-codes.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [QrCodesController],
  providers: [QrCodesService],
})
export class QrCodesModule {}
