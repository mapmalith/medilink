import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminHotelsService } from './admin-hotels.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { Role } from '@prisma/client';
import {
  CreateHotelDto,
  UpdateHotelDto,
  GenerateQRCodeDto,
  TopUpCreditDto,
} from './dto/hotel.dto';

@Controller('admin/hotels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminHotelsController {
  constructor(private readonly hotelsService: AdminHotelsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CALL_CENTER)
  async findAll() {
    const data = await this.hotelsService.findAll();
    return { success: true, data };
  }

  @Post()
  async create(
    @Body() dto: CreateHotelDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.hotelsService.create(dto, userId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.hotelsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHotelDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.hotelsService.update(id, dto, userId);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.hotelsService.remove(id, userId);
    return { success: true, data };
  }

  @Get(':id/qr-codes')
  async getQRCodes(@Param('id') id: string) {
    const data = await this.hotelsService.getQRCodes(id);
    return { success: true, data };
  }

  @Post(':id/qr-codes')
  async generateQRCode(
    @Param('id') id: string,
    @Body() dto: GenerateQRCodeDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.hotelsService.generateQRCode(
      id,
      dto.location,
      userId,
    );
    return { success: true, data };
  }

  @Post(':id/credit/top-up')
  async topUpCredit(
    @Param('id') id: string,
    @Body() dto: TopUpCreditDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.hotelsService.topUpCredit(
      id,
      dto.amount,
      dto.description,
      userId,
    );
    return { success: true, data };
  }

  @Get(':id/credit/ledger')
  async getCreditLedger(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.hotelsService.getCreditLedger(
      id,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
    return { success: true, data };
  }

  @Get(':id/appointments')
  async getAppointments(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.hotelsService.getAppointments(
      id,
      parseInt(page || '1', 10),
      parseInt(limit || '10', 10),
    );
    return { success: true, data };
  }
}
