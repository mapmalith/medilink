import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import type { IWhatsAppService } from './whatsapp.interface';

@Injectable()
export class WhatsAppService implements IWhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly client: Twilio;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID', '');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN', '');
    this.from = this.config.get<string>(
      'TWILIO_WHATSAPP_FROM',
      'whatsapp:+14155238886',
    );
    this.client = new Twilio(sid, token);
  }

  async sendTextMessage(
    to: string,
    body: string,
  ): Promise<{ messageSid: string }> {
    try {
      const message = await this.client.messages.create({
        from: this.from,
        to: `whatsapp:${to}`,
        body,
      });
      this.logger.log(`Sent to ${to}: ${body.slice(0, 80)}… [${message.sid}]`);
      return { messageSid: message.sid };
    } catch (err: unknown) {
      this.handleTwilioError(err, to);
      throw err;
    }
  }

  async sendMediaMessage(
    to: string,
    body: string,
    mediaUrl: string,
  ): Promise<{ messageSid: string }> {
    try {
      const message = await this.client.messages.create({
        from: this.from,
        to: `whatsapp:${to}`,
        body,
        mediaUrl: [mediaUrl],
      });
      this.logger.log(
        `Sent media to ${to}: ${body.slice(0, 60)}… [${message.sid}]`,
      );
      return { messageSid: message.sid };
    } catch (err: unknown) {
      this.handleTwilioError(err, to);
      throw err;
    }
  }

  private handleTwilioError(err: unknown, to: string): void {
    const twilioErr = err as {
      code?: number;
      message?: string;
      moreInfo?: string;
    };
    if (twilioErr.code === 63015) {
      this.logger.warn(
        `Recipient ${to} is not in the Twilio sandbox. ` +
          `They must first send 'join <code>' to the sandbox number.`,
      );
    } else {
      this.logger.error(
        `Twilio error sending to ${to}: code=${twilioErr.code} ` +
          `message="${twilioErr.message}" moreInfo=${twilioErr.moreInfo}`,
      );
    }
  }
}
