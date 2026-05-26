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
import { AdminPatientsService } from './admin-patients.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { Role } from '@prisma/client';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto';

@Controller('admin/patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminPatientsController {
  constructor(private readonly patientsService: AdminPatientsService) {}

  @Get()
  async findAll() {
    const data = await this.patientsService.findAll();
    return { success: true, data };
  }

  @Post()
  async create(
    @Body() dto: CreatePatientDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.patientsService.create(dto, userId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.patientsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.patientsService.update(id, dto, userId);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.patientsService.remove(id, userId);
    return { success: true, data };
  }

  @Get(':id/appointments')
  async getAppointments(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.patientsService.getAppointments(
      id,
      parseInt(page || '1', 10),
      parseInt(limit || '10', 10),
    );
    return { success: true, data };
  }
}
