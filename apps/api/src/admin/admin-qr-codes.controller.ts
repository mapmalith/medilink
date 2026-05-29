import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminHotelsService } from './admin-hotels.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';

@Controller('admin/qr-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminQRCodesController {
  constructor(private readonly hotelsService: AdminHotelsService) {}

  @Get()
  async listAll() {
    const data = await this.hotelsService.listAllQRCodes();
    return { success: true, data };
  }
}
