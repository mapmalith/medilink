import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminConfigService } from './admin-config.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { Role } from '@prisma/client';
import { UpdateConfigDto } from './dto/config.dto';

@Controller('admin/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminConfigController {
  constructor(private readonly configService: AdminConfigService) {}

  @Get()
  async findAll() {
    const data = await this.configService.findAll();
    return { success: true, data };
  }

  @Patch(':key')
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateConfigDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.configService.update(key, dto.value, userId);
    return { success: true, data };
  }
}
