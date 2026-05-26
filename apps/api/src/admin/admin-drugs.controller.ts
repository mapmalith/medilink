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
import { AdminDrugsService } from './admin-drugs.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { Role } from '@prisma/client';
import { CreateDrugDto, UpdateDrugDto } from './dto/drug.dto';

@Controller('admin/drugs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminDrugsController {
  constructor(private readonly drugsService: AdminDrugsService) {}

  @Get()
  async findAll() {
    const data = await this.drugsService.findAll();
    return { success: true, data };
  }

  @Post()
  async create(
    @Body() dto: CreateDrugDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.drugsService.create(dto, userId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.drugsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDrugDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.drugsService.update(id, dto, userId);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.drugsService.remove(id, userId);
    return { success: true, data };
  }
}
