import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { validateRequest } from 'twilio';
import { Throttle } from '@nestjs/throttler';
import { ConversationStateService } from './conversation-state.service';
import { WhatsAppDispatcher } from './whatsapp-dispatcher.service';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';

@Controller('whatsapp')
@SkipAudit()
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly conversation: ConversationStateService,
    private readonly dispatcher: WhatsAppDispatcher,
  ) {}

  /**
   * Twilio webhook — receives inbound WhatsApp messages as
   * application/x-www-form-urlencoded. Validates the Twilio signature
   * header unless running in mock mode (development).
   *
   * Returns empty TwiML — replies are sent via the REST API.
   */
  @Post('webhook')
  async webhook(
    @Body() body: Record<string, string>,
    @Headers('x-twilio-signature') signature: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validate Twilio signature in production
    const isMock = await this.dispatcher.isMockMode();
    if (!isMock) {
      const authToken = this.config.get<string>(
        'TWILIO_WEBHOOK_AUTH_TOKEN',
        '',
      );
      const fullUrl = `${this.config.get<string>('MEDILINK_BASE_URL', '')}${req.originalUrl}`;
      const valid = validateRequest(
        authToken,
        signature ?? '',
        fullUrl,
        body,
      );
      if (!valid) {
        this.logger.warn('Invalid Twilio signature — rejecting webhook');
        res.status(403).send('Invalid signature');
        return;
      }
    }

    // Parse Twilio payload
    const rawFrom = body.From ?? ''; // "whatsapp:+94771234567"
    const phone = rawFrom.replace('whatsapp:', '');
    const messageBody = body.Body ?? '';
    const profileName = body.ProfileName ?? '';
    const messageSid = body.MessageSid ?? null;

    this.logger.log(
      `← IN  ${phone}: "${messageBody.slice(0, 200)}" [${messageSid}]`,
    );

    // Log inbound
    await this.dispatcher.logInbound(phone, messageBody, messageSid);

    // Route through conversation state machine
    try {
      await this.conversation.handleMessage(phone, messageBody, profileName);
    } catch (err) {
      this.logger.error('Conversation handler error', err);
    }

    // Return empty TwiML — we send replies via REST API
    res.type('text/xml').send('<Response></Response>');
  }

  /**
   * Health check — shows whether WhatsApp is in mock or live mode.
   */
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
}
