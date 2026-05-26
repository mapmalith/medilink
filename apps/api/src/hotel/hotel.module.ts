import { Module } from '@nestjs/common';
import { HotelController } from './hotel.controller';
import { HotelsSearchController } from './hotels-search.controller';
import { HotelService } from './hotel.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [HotelController, HotelsSearchController],
  providers: [HotelService],
})
export class HotelModule {}
