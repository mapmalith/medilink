import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminDoctorsService } from './admin-doctors.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles, CurrentUser } from '../auth/decorators';
import { Role } from '@prisma/client';
import {
  CreateDoctorDto,
  UpdateDoctorDto,
  BulkAvailabilityDto,
} from './dto/doctor.dto';

@Controller('admin/doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminDoctorsController {
  constructor(private readonly doctorsService: AdminDoctorsService) {}

  @Get()
  async findAll() {
    const data = await this.doctorsService.findAll();
    return { success: true, data };
  }

  @Post()
  async create(
    @Body() dto: CreateDoctorDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.doctorsService.create(dto, userId);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.doctorsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.doctorsService.update(id, dto, userId);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.doctorsService.remove(id, userId);
    return { success: true, data };
  }

  @Get(':id/availability')
  async getAvailability(@Param('id') id: string) {
    const data = await this.doctorsService.getAvailability(id);
    return { success: true, data };
  }

  @Put(':id/availability')
  async replaceAvailability(
    @Param('id') id: string,
    @Body() dto: BulkAvailabilityDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.doctorsService.replaceAvailability(
      id,
      dto.slots,
      userId,
    );
    return { success: true, data };
  }

  @Get(':id/appointments')
  async getAppointments(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.doctorsService.getAppointments(
      id,
      parseInt(page || '1', 10),
      parseInt(limit || '10', 10),
    );
    return { success: true, data };
  }
}
