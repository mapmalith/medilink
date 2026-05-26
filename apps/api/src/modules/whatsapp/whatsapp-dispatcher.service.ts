import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppMockService } from './whatsapp-mock.service';
import type { IWhatsAppService, SendContext } from './whatsapp.interface';

/**
 * Dispatcher that routes each call to either the real Twilio service or
 * the mock, based on a runtime check of SystemConfig (`use_mock_whatsapp`)
 * falling back to the `USE_MOCK_WHATSAPP` env var. Also logs every
 * outbound message to the WhatsAppLog table.
 */
@Injectable()
export class WhatsAppDispatcher implements IWhatsAppService {
  private readonly logger = new Logger(WhatsAppDispatcher.name);
  private readonly real: WhatsAppService;
  private readonly mock: WhatsAppMockService;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.real = new WhatsAppService(config);
    this.mock = new WhatsAppMockService();
  }

  async sendTextMessage(
    to: string,
    body: string,
    ctx?: SendContext,
  ): Promise<{ messageSid: string }> {
    const svc = await this.resolve();
    const result = await svc.sendTextMessage(to, body);
    await this.log('out', to, body, result.messageSid, undefined, ctx?.appointmentId);
    return result;
  }

  async sendMediaMessage(
    to: string,
    body: string,
    mediaUrl: string,
    ctx?: SendContext,
  ): Promise<{ messageSid: string }> {
    const svc = await this.resolve();
    const result = await svc.sendMediaMessage(to, body, mediaUrl);
    await this.log('out', to, body, result.messageSid, undefined, ctx?.appointmentId);
    return result;
  }

  /**
   * Fire-and-forget send: never throws, logs the error. Use this in the
   * appointment lifecycle where a failed WhatsApp send must NOT block the
   * API response.
   */
  async tryTextMessage(
    to: string | null | undefined,
    body: string,
    ctx?: SendContext,
  ): Promise<void> {
    if (!to) return;
    try {
      await this.sendTextMessage(to, body, ctx);
    } catch (err) {
      this.logger.error(
        `WhatsApp send to ${to} failed: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Log an inbound message (called by the webhook controller).
   */
  async logInbound(
    phone: string,
    body: string,
    messageSid: string | null,
    state?: string,
  ): Promise<void> {
    await this.log('in', phone, body, messageSid, state);
  }

  /**
   * Check whether mock mode is active. SystemConfig row `use_mock_whatsapp`
   * overrides the env var at runtime.
   */
  async isMockMode(): Promise<boolean> {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: 'use_mock_whatsapp' },
    });
    if (row) return row.value === 'true';
    return this.config.get<string>('USE_MOCK_WHATSAPP', 'true') === 'true';
  }

  private async resolve(): Promise<IWhatsAppService> {
    return (await this.isMockMode()) ? this.mock : this.real;
  }

  private async log(
    direction: string,
    phone: string,
    body: string,
    messageSid: string | null,
    state?: string,
    appointmentId?: string,
  ): Promise<void> {
    try {
      await this.prisma.whatsAppLog.create({
        data: {
          direction,
          phone,
          body: body.slice(0, 2000),
          messageSid,
          state,
          appointmentId,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write WhatsAppLog', err);
    }
  }
}
