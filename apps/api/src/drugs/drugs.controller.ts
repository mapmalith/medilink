import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DrugsService } from './drugs.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';

@Controller('drugs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR, Role.ADMIN, Role.CALL_CENTER)
export class DrugsController {
  constructor(private readonly drugsService: DrugsService) {}

  @Get('search')
  async search(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 20;
    const data = await this.drugsService.search(
      q ?? '',
      Number.isNaN(parsedLimit) ? 20 : parsedLimit,
    );
    return { success: true, data };
  }
}
