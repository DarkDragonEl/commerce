/**
 * Payment Routes
 */

import { FastifyInstance } from 'fastify';
import { getRabbitMQ } from '@ecommerce/shared';
import { PaymentController } from '../controllers/payment.controller';
import { WebhookController } from '../controllers/webhook.controller';
import { PaymentService } from '../../services/payment.service';
import { PaymentRepository } from '../../repositories/payment.repository';
import { RefundRepository } from '../../repositories/refund.repository';
import { TransactionRepository } from '../../repositories/transaction.repository';
import { CreatePaymentSchema, ConfirmPaymentSchema, RefundPaymentSchema } from '../validators/payment.validator';

export async function paymentRoutes(app: FastifyInstance) {
  const paymentRepository = new PaymentRepository();
  const refundRepository = new RefundRepository();
  const transactionRepository = new TransactionRepository();

  const rabbitmq = getRabbitMQ();
  const paymentService = new PaymentService(
    paymentRepository,
    refundRepository,
    transactionRepository,
    rabbitmq
  );

  const paymentController = new PaymentController(paymentService);
  const webhookController = new WebhookController(paymentService);

  // Create payment
  app.post('/', {
    schema: {
      description: 'Create a new payment',
      tags: ['Payments'],
    },
    preHandler: async (request, reply) => {
      const result = CreatePaymentSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, paymentController.createPayment.bind(paymentController));

  // Confirm payment
  app.post('/:id/confirm', {
    schema: {
      description: 'Confirm a payment',
      tags: ['Payments'],
    },
    preHandler: async (request, reply) => {
      const result = ConfirmPaymentSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, paymentController.confirmPayment.bind(paymentController));

  // Get payment
  app.get('/:id', {
    schema: {
      description: 'Get payment by ID',
      tags: ['Payments'],
    },
  }, paymentController.getPayment.bind(paymentController));

  // Get payment by order ID
  app.get('/order/:orderId', {
    schema: {
      description: 'Get payment by order ID',
      tags: ['Payments'],
    },
  }, paymentController.getPaymentByOrderId.bind(paymentController));

  // Get user payments
  app.get('/user/:userId', {
    schema: {
      description: 'Get all payments for a user',
      tags: ['Payments'],
    },
  }, paymentController.getUserPayments.bind(paymentController));

  // Cancel payment
  app.post('/:id/cancel', {
    schema: {
      description: 'Cancel a payment',
      tags: ['Payments'],
    },
  }, paymentController.cancelPayment.bind(paymentController));

  // Refund payment
  app.post('/:id/refund', {
    schema: {
      description: 'Refund a payment',
      tags: ['Payments'],
    },
    preHandler: async (request, reply) => {
      const result = RefundPaymentSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, paymentController.refundPayment.bind(paymentController));

  // Stripe webhook (no authentication, uses signature verification)
  app.post('/webhooks/stripe', {
    schema: {
      description: 'Stripe webhook endpoint',
      tags: ['Webhooks'],
      hide: true, // Hide from Swagger docs
    },
    config: {
      rawBody: true, // Need raw body for signature verification
    },
  }, webhookController.handleStripeWebhook.bind(webhookController));
}
