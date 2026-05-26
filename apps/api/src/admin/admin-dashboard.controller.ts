import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/decorators';
import { Role } from '@prisma/client';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('stats')
  async getStats() {
    const data = await this.dashboardService.getStats();
    return { success: true, data };
  }

  @Get('todays-appointments')
  async getTodaysAppointments() {
    const data = await this.dashboardService.getTodaysAppointments();
    return { success: true, data };
  }

  @Get('recent-activity')
  async getRecentActivity() {
    const data = await this.dashboardService.getRecentActivity();
    return { success: true, data };
  }
}
