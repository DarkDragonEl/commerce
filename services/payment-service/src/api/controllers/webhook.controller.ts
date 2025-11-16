/**
 * Webhook Controller
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { stripeClient } from '../../clients/stripe.client';
import { PaymentService } from '../../services/payment.service';
import { logger } from '@ecommerce/shared';
import { env } from '../../config/env';

export class WebhookController {
  constructor(private paymentService: PaymentService) {}

  async handleStripeWebhook(
    request: FastifyRequest<{ Body: string | Buffer }>,
    reply: FastifyReply
  ) {
    const signature = request.headers['stripe-signature'];

    if (!signature) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Missing Stripe signature',
        },
      });
    }

    try {
      // Verify webhook signature
      const event = stripeClient.constructWebhookEvent(
        request.body as any,
        signature as string,
        env.STRIPE_WEBHOOK_SECRET
      );

      logger.info('Stripe webhook received', { type: event.type, eventId: event.id });

      // Process event asynchronously
      await this.paymentService.handleWebhookEvent(event);

      return reply.send({ received: true });
    } catch (error: any) {
      logger.error('Webhook signature verification failed', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: error.message,
        },
      });
    }
  }
}
