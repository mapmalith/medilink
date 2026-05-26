import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { HotelService } from './hotel.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { ListHotelAppointmentsQueryDto } from './dto/list-appointments.dto';
import {
  ListCreditLedgerQueryDto,
  ListHotelInvoicesQueryDto,
} from './dto/billing.dto';

@Controller('hotel')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.HOTEL)
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    const data = await this.hotelService.getMe(userId);
    return { success: true, data };
  }

  @Get('dashboard/stats')
  async getDashboardStats(@CurrentUser('id') userId: string) {
    const data = await this.hotelService.getDashboardStats(userId);
    return { success: true, data };
  }

  @Get('appointments')
  async listAppointments(
    @CurrentUser('id') userId: string,
    @Query() query: ListHotelAppointmentsQueryDto,
  ) {
    const data = await this.hotelService.listAppointments(userId, query);
    return { success: true, data };
  }

  @Get('credit')
  async getCredit(@CurrentUser('id') userId: string) {
    const data = await this.hotelService.getCreditInfo(userId);
    return { success: true, data };
  }

  @Get('credit/ledger')
  async getCreditLedger(
    @CurrentUser('id') userId: string,
    @Query() query: ListCreditLedgerQueryDto,
  ) {
    const data = await this.hotelService.listCreditLedger(userId, query);
    return { success: true, data };
  }

  @Get('invoices')
  async listInvoices(
    @CurrentUser('id') userId: string,
    @Query() query: ListHotelInvoicesQueryDto,
  ) {
    const data = await this.hotelService.listInvoices(userId, query);
    return { success: true, data };
  }
}
