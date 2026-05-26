import { Injectable, Logger } from '@nestjs/common';
import type { IWhatsAppService } from './whatsapp.interface';

@Injectable()
export class WhatsAppMockService implements IWhatsAppService {
  private readonly logger = new Logger(WhatsAppMockService.name);

  async sendTextMessage(
    to: string,
    body: string,
  ): Promise<{ messageSid: string }> {
    const sid = `MOCK_${Date.now()}`;
    this.logger.log(
      `\n[WhatsApp MOCK] → ${to}\n` +
        `[WhatsApp MOCK] BODY: ${body}\n` +
        `[WhatsApp MOCK] -------------------------`,
    );
    return { messageSid: sid };
  }

  async sendMediaMessage(
    to: string,
    body: string,
    mediaUrl: string,
  ): Promise<{ messageSid: string }> {
    const sid = `MOCK_${Date.now()}`;
    this.logger.log(
      `\n[WhatsApp MOCK] → ${to}\n` +
        `[WhatsApp MOCK] BODY: ${body}\n` +
        `[WhatsApp MOCK] MEDIA: ${mediaUrl}\n` +
        `[WhatsApp MOCK] -------------------------`,
    );
    return { messageSid: sid };
  }
}
