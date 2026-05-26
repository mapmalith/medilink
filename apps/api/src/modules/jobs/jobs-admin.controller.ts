import { BadRequestException, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { Roles } from '../../auth/decorators';
import { JobsAdminService } from './jobs-admin.service';
import { ALL_QUEUE_NAMES, QueueName } from './queue-tokens';

@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@SkipThrottle()
export class JobsAdminController {
  constructor(private readonly admin: JobsAdminService) {}

  @Get('stats')
  async getStats() {
    const data = await this.admin.getQueueStats();
    return { success: true, data };
  }

  @Get('failed')
  async getFailed() {
    const data = await this.admin.getFailedJobs();
    return { success: true, data };
  }

  @Post(':queue/:id/retry')
  async retry(@Param('queue') queue: string, @Param('id') id: string) {
    if (!ALL_QUEUE_NAMES.includes(queue as QueueName)) {
      throw new BadRequestException(`Unknown queue: ${queue}`);
    }
    const data = await this.admin.retryJob(queue as QueueName, id);
    return { success: true, data };
  }
}
