import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAppointmentsService } from './admin-appointments.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { Role } from '@prisma/client';
import {
  AssignDoctorDto,
  ListAppointmentsQueryDto,
  UpdateAppointmentStatusDto,
} from './dto/appointment.dto';

@Controller('admin/appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminAppointmentsController {
  constructor(
    private readonly appointmentsService: AdminAppointmentsService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.CALL_CENTER)
  async findAll(@Query() query: ListAppointmentsQueryDto) {
    const data = await this.appointmentsService.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CALL_CENTER)
  async findOne(@Param('id') id: string) {
    const data = await this.appointmentsService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.CALL_CENTER)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.appointmentsService.updateStatus(id, dto, userId);
    return { success: true, data };
  }

  @Patch(':id/assign-doctor')
  async assignDoctor(
    @Param('id') id: string,
    @Body() dto: AssignDoctorDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.appointmentsService.assignDoctor(
      id,
      dto.doctorId,
      userId,
    );
    return { success: true, data };
  }
}
