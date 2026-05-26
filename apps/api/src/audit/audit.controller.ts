import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import { SkipAudit } from '../common/decorators/skip-audit.decorator';
import { AuditService } from './audit.service';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@SkipAudit()
@SkipThrottle()
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  async list(
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('entityId') entityId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const data = await this.audit.list({
      userId,
      entity,
      action,
      entityId,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
    return { success: true, data };
  }

  @Get('entities')
  async entities() {
    const data = await this.audit.listEntities();
    return { success: true, data };
  }

  @Get('actions')
  async actions() {
    const data = await this.audit.listActions();
    return { success: true, data };
  }
}
