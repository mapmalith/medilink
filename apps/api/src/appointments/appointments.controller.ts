import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import {
  AvailableSlotsQueryDto,
  RescheduleAppointmentDto,
} from './dto/reschedule.dto';
import {
  AvailableSlotsListQueryDto,
  CreateAppointmentDto,
} from './dto/create-appointment.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.CALL_CENTER)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.CALL_CENTER, Role.HOTEL)
  async create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const data = await this.appointmentsService.createAppointment(
      dto,
      user.id,
      user.role,
    );
    return { success: true, data };
  }

  @Get('stats')
  @Roles(Role.ADMIN, Role.CALL_CENTER)
  async getStats(@Query('scope') scope = 'today') {
    const data = await this.appointmentsService.getStats(scope);
    return { success: true, data };
  }

  @Get('search')
  @Roles(Role.ADMIN, Role.CALL_CENTER)
  async search(@Query('q') q?: string) {
    const data = await this.appointmentsService.search(q ?? '');
    return { success: true, data };
  }

  @Get('available-slots')
  @Roles(Role.ADMIN, Role.CALL_CENTER, Role.HOTEL)
  async listAvailableSlots(@Query() query: AvailableSlotsListQueryDto) {
    const data = await this.appointmentsService.listAvailableSlots(
      query.date,
      query.appointmentType,
      query.doctorId,
    );
    return { success: true, data };
  }

  @Post(':id/reschedule')
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const data = await this.appointmentsService.reschedule(
      id,
      dto,
      user.id,
      user.role,
    );
    return { success: true, data };
  }

  @Get(':id/reschedule-history')
  async getHistory(@Param('id') id: string) {
    const data = await this.appointmentsService.getRescheduleHistory(id);
    return { success: true, data };
  }

  @Get(':id/available-slots')
  async getAvailableSlots(
    @Param('id') id: string,
    @Query() query: AvailableSlotsQueryDto,
  ) {
    const data = await this.appointmentsService.getAvailableSlots(
      id,
      query.date,
      query.doctorId,
    );
    return { success: true, data };
  }
}
