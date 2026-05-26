import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// Stripe v22 uses `export = StripeConstructor` with the real type namespace
// nested under `StripeConstructor.Stripe`. The import = require form is the
// only way to preserve both the callable value and the type alias path.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Stripe = require('stripe');

// Stripe v22 doesn't re-export its namespace from the package root; extract
// the types we need from the client instance's method signatures instead.
type StripeClient = InstanceType<typeof Stripe>;
type CheckoutSession = Awaited<
  ReturnType<StripeClient['checkout']['sessions']['create']>
>;
type StripeEvent = ReturnType<StripeClient['webhooks']['constructEvent']>;

/**
 * Thin wrapper around the Stripe SDK. Holds a single client instance and
 * exposes the two things the payments flow needs: creating a Checkout
 * Session for an appointment, and verifying the webhook signature.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: StripeClient;
  private readonly webhookSecret: string;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.config.get<string>(
      'STRIPE_WEBHOOK_SECRET',
      '',
    );
    this.client = new Stripe(secretKey);
  }

  /**
   * Create a Checkout Session that acts as the "payment link" for an
   * appointment. Inline price_data avoids having to pre-provision a
   * Stripe Product/Price per appointment. The appointmentId is stamped
   * into the session metadata so the webhook can route it back.
   */
  async createCheckoutSession(params: {
    appointmentId: string;
    amount: number; // in currency units (dollars, not cents)
    currency: string;
    description: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession> {
    return this.client.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: { name: params.description },
            unit_amount: Math.round(params.amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { appointmentId: params.appointmentId },
      payment_intent_data: {
        metadata: { appointmentId: params.appointmentId },
      },
      expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    });
  }

  /**
   * Verify + parse a Stripe webhook event. `rawBody` must be the exact
   * bytes Stripe sent — if the body has been parsed through JSON the
   * signature will not match.
   */
  constructWebhookEvent(
    rawBody: Buffer | string,
    signature: string,
  ): StripeEvent {
    if (!this.webhookSecret) {
      this.logger.warn(
        'STRIPE_WEBHOOK_SECRET is not configured — webhook events cannot be verified',
      );
    }
    return this.client.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }
}
