import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { SkipAudit } from '../common/decorators/skip-audit.decorator';

/**
 * Stripe webhook receiver. Deliberately on its OWN controller class so it
 * can sit under the /payments prefix without inheriting the class-level
 * JWT/role guards from PaymentsController. Stripe calls this endpoint
 * unauthenticated and we verify the caller via the X-Signature header.
 */
@Controller('payments')
@SkipAudit()
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    if (!signature) {
      this.logger.warn('Stripe webhook hit with no stripe-signature header');
      return { received: false };
    }
    if (!req.rawBody) {
      this.logger.error(
        'Raw body missing on Stripe webhook — NestFactory rawBody option not enabled?',
      );
      return { received: false };
    }

    try {
      await this.paymentsService.handleWebhook(req.rawBody, signature);
      return { received: true };
    } catch (err) {
      // Don't 500 — Stripe will retry. Return 200 with received: false
      // only for signature mismatches; for downstream errors return 500 so
      // Stripe retries.
      const message = (err as Error).message;
      if (message.includes('signature') || message.includes('Signature')) {
        this.logger.warn(`Stripe webhook signature invalid: ${message}`);
        return { received: false };
      }
      this.logger.error(`Stripe webhook handler failed: ${message}`);
      throw err;
    }
  }
}
