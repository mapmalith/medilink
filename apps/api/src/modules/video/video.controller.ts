import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { CurrentUser, Roles } from '../../auth/decorators';
import { VideoService } from './video.service';

@Controller('video')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  /**
   * Pre-create a video room for an appointment. Used by scheduled jobs or
   * admins who want to warm the room up ahead of time.
   */
  @Post('create-room')
  @Roles(Role.ADMIN, Role.CALL_CENTER)
  async createRoom(@Body() body: { appointmentId: string }) {
    const data = await this.videoService.createRoom(body.appointmentId);
    return { success: true, data };
  }

  /**
   * Return the room URL + appointment summary for a caller who is about
   * to join the call. Any authenticated role may call; the service
   * enforces that non-admin callers must be the patient or doctor on the
   * appointment.
   */
  @Get('join/:appointmentId')
  async join(
    @Param('appointmentId') appointmentId: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    const data = await this.videoService.getRoomForJoin(
      appointmentId,
      user.id,
      user.role,
    );
    return { success: true, data };
  }
}
