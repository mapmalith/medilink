import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { CurrentUser, Roles } from '../../auth/decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppDispatcher } from './whatsapp-dispatcher.service';

@Controller('admin/whatsapp')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class WhatsAppAdminController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly dispatcher: WhatsAppDispatcher,
  ) {}

  @Get('health')
  async health() {
    const isMock = await this.dispatcher.isMockMode();
    const sandboxNumber = this.config.get<string>(
      'TWILIO_WHATSAPP_FROM',
      'not configured',
    );
    return {
      success: true,
      data: {
        mode: isMock ? 'mock' : 'live',
        sandboxNumber,
        ready: true,
      },
    };
  }

  @Get('logs')
  async getLogs(@Query('limit') limitStr?: string) {
    const limit = Math.min(parseInt(limitStr ?? '50', 10) || 50, 200);
    const logs = await this.prisma.whatsAppLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { success: true, data: logs };
  }

  @Post('test-send')
  async testSend(
    @Body() body: { phone: string; message: string },
    @CurrentUser('id') userId: string,
  ) {
    const { phone, message } = body;
    if (!phone || !message) {
      return {
        success: false,
        error: 'phone and message are required',
      };
    }
    const result = await this.dispatcher.sendTextMessage(phone, message);
    return { success: true, data: result };
  }

  @Post('mode')
  async setMode(
    @Body() body: { mock: boolean },
    @CurrentUser('id') userId: string,
  ) {
    const value = body.mock ? 'true' : 'false';
    await this.prisma.systemConfig.upsert({
      where: { key: 'use_mock_whatsapp' },
      update: { value },
      create: {
        key: 'use_mock_whatsapp',
        value,
        description: 'Whether WhatsApp uses mock (console) or live (Twilio)',
      },
    });
    return {
      success: true,
      data: { mode: body.mock ? 'mock' : 'live' },
    };
  }
}
