import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminStaffService } from './admin-staff.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { Role } from '@prisma/client';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';

@Controller('admin/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminStaffController {
  constructor(private readonly staffService: AdminStaffService) {}

  @Get()
  async findAll() {
    const data = await this.staffService.findAll();
    return { success: true, data };
  }

  @Post()
  async create(
    @Body() dto: CreateStaffDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.staffService.create(dto, userId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.staffService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.staffService.update(id, dto, userId);
    return { success: true, data };
  }

  @Patch(':id/toggle-active')
  async toggleActive(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.staffService.toggleActive(id, userId);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.staffService.remove(id, userId);
    return { success: true, data };
  }
}
