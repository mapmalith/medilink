import { Module } from '@nestjs/common';
import { DrugsController } from './drugs.controller';
import { DrugsService } from './drugs.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DrugsController],
  providers: [DrugsService],
})
export class DrugsModule {}
