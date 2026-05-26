import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { GdprService } from './gdpr.service';
import { RecordConsentDto } from './dto/gdpr.dto';

function clientIp(req: Request): string | null {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0];
  return req.ip ?? null;
}

@Controller('patients/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GdprController {
  constructor(private readonly gdpr: GdprService) {}

  @Post('consent')
  @Roles(Role.PATIENT, Role.HOTEL, Role.ADMIN, Role.CALL_CENTER)
  async recordConsent(
    @Param('id') patientId: string,
    @Body() dto: RecordConsentDto,
    @CurrentUser() user: { id: string; role: Role },
    @Req() req: Request,
  ) {
    const ua = req.headers['user-agent'];
    const data = await this.gdpr.recordConsent(
      patientId,
      dto,
      user.id,
      user.role,
      clientIp(req),
      typeof ua === 'string' ? ua : null,
    );
    return { success: true, data };
  }

  @Get('consent')
  @Roles(Role.PATIENT, Role.HOTEL, Role.ADMIN, Role.CALL_CENTER)
  async listConsents(
    @Param('id') patientId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const data = await this.gdpr.listConsents(patientId, user.id, user.role);
    return { success: true, data };
  }

  @Post('data-export')
  @Roles(Role.PATIENT, Role.ADMIN, Role.CALL_CENTER)
  async exportData(
    @Param('id') patientId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const data = await this.gdpr.exportData(patientId, user.id, user.role);
    return { success: true, data };
  }

  @Delete('data')
  @Roles(Role.ADMIN)
  async erase(
    @Param('id') patientId: string,
    @Query('confirm') confirm: string | undefined,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    const data = await this.gdpr.eraseData(
      patientId,
      user.id,
      confirm === 'true',
      clientIp(req),
    );
    return { success: true, data };
  }
}
