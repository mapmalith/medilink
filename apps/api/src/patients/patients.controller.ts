import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PatientsService } from './patients.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { CreatePatientDto, SearchPatientsDto } from './dto/patient.dto';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.CALL_CENTER, Role.HOTEL)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get('search')
  async search(
    @Query() query: SearchPatientsDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const data = await this.patientsService.search(query.q, user.id, user.role);
    return { success: true, data };
  }

  @Post()
  async create(
    @Body() dto: CreatePatientDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const data = await this.patientsService.create(dto, user.id, user.role);
    return { success: true, data };
  }
}
