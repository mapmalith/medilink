import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { QrCodesService } from './qr-codes.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { CurrentUser, Roles } from '../auth/decorators';
import { GenerateQrCodeDto } from './dto/generate-qr-code.dto';

@Controller('qr-codes')
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  /**
   * Generate a new QR code for a hotel. Requires ADMIN role.
   */
  @Post('generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async generate(
    @Body() dto: GenerateQrCodeDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.qrCodesService.generate(
      dto.hotelId,
      dto.location,
      userId,
    );
    return { success: true, data };
  }

  /**
   * Record a scan and return the WhatsApp redirect URL. Public — no auth
   * required since this is hit by anyone scanning the QR code.
   */
  @Get(':code/scan')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async scan(@Param('code') code: string) {
    const data = await this.qrCodesService.scan(code);
    return { success: true, data };
  }

  /**
   * Serve the QR code image as a PNG. Public — used by the scan page and
   * downloadable from the admin panel.
   */
  @Get(':code/image')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=86400')
  async getImage(@Param('code') code: string, @Res() res: Response) {
    const buffer = await this.qrCodesService.getImage(code);
    res.set({
      'Content-Disposition': `inline; filename="${code}.png"`,
    });
    res.send(buffer);
  }
}
