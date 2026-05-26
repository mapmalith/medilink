import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { DoctorService } from './doctor.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { ListDoctorAppointmentsQueryDto } from './dto/list-appointments.dto';
import { BulkDoctorAvailabilityDto } from './dto/availability.dto';
import { CompleteConsultationDto } from './dto/complete-consultation.dto';

@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    const data = await this.doctorService.getMe(userId);
    return { success: true, data };
  }

  @Get('appointments')
  async listAppointments(
    @CurrentUser('id') userId: string,
    @Query() query: ListDoctorAppointmentsQueryDto,
  ) {
    const data = await this.doctorService.listAppointments(userId, query);
    return { success: true, data };
  }

  @Get('appointments/today')
  async listToday(@CurrentUser('id') userId: string) {
    const data = await this.doctorService.listToday(userId);
    return { success: true, data };
  }

  @Get('appointments/:id')
  async getAppointment(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.doctorService.getAppointment(userId, id);
    return { success: true, data };
  }

  @Get('stats')
  async getStats(@CurrentUser('id') userId: string) {
    const data = await this.doctorService.getStats(userId);
    return { success: true, data };
  }

  @Patch('appointments/:id/start')
  async startConsultation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.doctorService.startConsultation(userId, id);
    return { success: true, data };
  }

  @Post('appointments/:id/complete')
  async completeConsultation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: CompleteConsultationDto,
  ) {
    const data = await this.doctorService.completeConsultation(
      userId,
      id,
      body,
    );
    return { success: true, data };
  }

  @Get('availability')
  async getAvailability(@CurrentUser('id') userId: string) {
    const data = await this.doctorService.getAvailability(userId);
    return { success: true, data };
  }

  @Put('availability')
  async replaceAvailability(
    @CurrentUser('id') userId: string,
    @Body() body: BulkDoctorAvailabilityDto,
  ) {
    const data = await this.doctorService.replaceAvailability(
      userId,
      body.slots,
    );
    return { success: true, data };
  }

  @Delete('availability/:id')
  async deleteAvailability(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const data = await this.doctorService.deleteAvailabilitySlot(userId, id);
    return { success: true, data };
  }
}
