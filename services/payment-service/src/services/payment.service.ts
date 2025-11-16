/**
 * Payment Service
 */

import { Payment, PaymentStatus, PaymentMethod } from '@prisma/client';
import {
  logger,
  RabbitMQClient,
  BadRequestError,
  NotFoundError,
  PaymentEventType,
} from '@ecommerce/shared';
import { paymentClient } from '../clients';
import { PaymentRepository } from '../repositories/payment.repository';
import { RefundRepository } from '../repositories/refund.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import crypto from 'crypto';

export interface CreatePaymentInput {
  orderId: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export class PaymentService {
  constructor(
    private paymentRepository: PaymentRepository,
    private refundRepository: RefundRepository,
    private transactionRepository: TransactionRepository,
    private rabbitmq?: RabbitMQClient
  ) {}

  async createPayment(data: CreatePaymentInput): Promise<Payment> {
    try {
      // Convert amount to cents for Stripe
      const amountInCents = Math.round(data.amount * 100);

      // Create Stripe payment intent
      const paymentIntent = await paymentClient.createPaymentIntent({
        amount: amountInCents,
        currency: data.currency || 'USD',
        paymentMethodId: data.paymentMethodId,
        description: data.description,
        metadata: {
          orderId: data.orderId,
          userId: data.userId,
          ...data.metadata,
        },
      });

      // Create payment record
      const payment = await this.paymentRepository.create({
        orderId: data.orderId,
        userId: data.userId,
        userEmail: data.userEmail,
        stripePaymentIntentId: paymentIntent.id,
        amount: data.amount,
        currency: data.currency || 'USD',
        status: this.mapStripeStatus(paymentIntent.status),
        paymentMethod: data.paymentMethod,
        paymentProvider: 'stripe',
        clientSecret: paymentIntent.client_secret,
        description: data.description,
        metadata: data.metadata,
      });

      // Log transaction
      await this.transactionRepository.createLog(
        payment.id,
        'payment',
        data.amount,
        'pending',
        false,
        {
          externalId: paymentIntent.id,
          externalType: 'stripe',
          description: 'Payment intent created',
        }
      );

      logger.info('Payment created', {
        paymentId: payment.id,
        orderId: data.orderId,
        amount: data.amount,
      });

      return payment;
    } catch (error: any) {
      logger.error('Failed to create payment', error);
      throw new BadRequestError(error.message || 'Failed to create payment');
    }
  }

  async confirmPayment(paymentId: string, paymentMethodId?: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestError('No Stripe payment intent associated');
    }

    try {
      // Confirm with Stripe
      const paymentIntent = await paymentClient.confirmPaymentIntent(
        payment.stripePaymentIntentId,
        paymentMethodId
      );

      // Update payment status
      const updatedPayment = await this.paymentRepository.updateStatus(
        paymentId,
        this.mapStripeStatus(paymentIntent.status)
      );

      // Log transaction
      await this.transactionRepository.createLog(
        paymentId,
        'payment',
        Number(payment.amount),
        paymentIntent.status,
        paymentIntent.status === 'succeeded',
        {
          externalId: paymentIntent.id,
          externalType: 'stripe',
          description: 'Payment confirmed',
        }
      );

      logger.info('Payment confirmed', { paymentId, status: paymentIntent.status });

      return updatedPayment;
    } catch (error: any) {
      // Update payment with error
      await this.paymentRepository.update(paymentId, {
        status: PaymentStatus.FAILED,
        errorMessage: error.message,
        failedAt: new Date(),
      });

      // Log failure
      await this.transactionRepository.createLog(
        paymentId,
        'payment',
        Number(payment.amount),
        'failed',
        false,
        {
          externalId: payment.stripePaymentIntentId,
          externalType: 'stripe',
          errorMessage: error.message,
        }
      );

      logger.error('Payment confirmation failed', error);
      throw new BadRequestError(error.message || 'Payment confirmation failed');
    }
  }

  async getPayment(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(id);

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    return payment;
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return await this.paymentRepository.findByOrderId(orderId);
  }

  async getUserPayments(userId: string, limit?: number): Promise<Payment[]> {
    return await this.paymentRepository.findByUserId(userId, limit);
  }

  async cancelPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status === PaymentStatus.SUCCEEDED) {
      throw new BadRequestError('Cannot cancel succeeded payment. Use refund instead.');
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestError('No Stripe payment intent associated');
    }

    try {
      // Cancel with Stripe
      await paymentClient.cancelPaymentIntent(payment.stripePaymentIntentId);

      // Update payment status
      const updatedPayment = await this.paymentRepository.updateStatus(
        paymentId,
        PaymentStatus.CANCELLED
      );

      // Log transaction
      await this.transactionRepository.createLog(
        paymentId,
        'cancel',
        Number(payment.amount),
        'cancelled',
        true,
        {
          externalId: payment.stripePaymentIntentId,
          externalType: 'stripe',
          description: 'Payment cancelled',
        }
      );

      // Publish event
      if (this.rabbitmq) {
        await this.rabbitmq.publish('ecommerce.events', 'payment.cancelled', {
          id: crypto.randomUUID(),
          type: 'payment.cancelled',
          timestamp: new Date().toISOString(),
          source: 'payment-service',
          data: {
            paymentId: updatedPayment.id,
            orderId: updatedPayment.orderId,
          },
        });
      }

      logger.info('Payment cancelled', { paymentId });

      return updatedPayment;
    } catch (error: any) {
      logger.error('Failed to cancel payment', error);
      throw new BadRequestError(error.message || 'Failed to cancel payment');
    }
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestError('Can only refund succeeded payments');
    }

    if (!payment.stripePaymentIntentId) {
      throw new BadRequestError('No Stripe payment intent associated');
    }

    try {
      const amountInCents = amount ? Math.round(amount * 100) : undefined;

      // Create refund with Stripe
      const stripeRefund = await paymentClient.createRefund({
        paymentIntentId: payment.stripePaymentIntentId,
        amount: amountInCents,
        reason,
      });

      // Create refund record
      const refund = await this.refundRepository.create({
        payment: { connect: { id: paymentId } },
        stripeRefundId: stripeRefund.id,
        amount: (stripeRefund.amount || 0) / 100,
        currency: stripeRefund.currency.toUpperCase(),
        status: 'SUCCEEDED',
        reason: reason || 'requested_by_customer',
        succeededAt: new Date(),
      });

      // Update payment
      const totalRefunded = Number(payment.amountRefunded) + refund.amount;
      const isFullyRefunded = totalRefunded >= Number(payment.amount);

      const updatedPayment = await this.paymentRepository.update(paymentId, {
        amountRefunded: totalRefunded,
        status: isFullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
      });

      // Log transaction
      await this.transactionRepository.createLog(
        paymentId,
        'refund',
        Number(refund.amount),
        'succeeded',
        true,
        {
          externalId: stripeRefund.id,
          externalType: 'stripe',
          description: `Refund ${isFullyRefunded ? 'full' : 'partial'}`,
        }
      );

      // Publish event
      if (this.rabbitmq) {
        await this.rabbitmq.publish('ecommerce.events', 'payment.refunded', {
          id: crypto.randomUUID(),
          type: PaymentEventType.REFUNDED,
          timestamp: new Date().toISOString(),
          source: 'payment-service',
          data: {
            paymentId: updatedPayment.id,
            orderId: updatedPayment.orderId,
            amount: Number(refund.amount),
            currency: refund.currency,
          },
        });
      }

      logger.info('Payment refunded', { paymentId, refundId: refund.id, amount: refund.amount });

      return updatedPayment;
    } catch (error: any) {
      logger.error('Failed to refund payment', error);
      throw new BadRequestError(error.message || 'Failed to refund payment');
    }
  }

  async handleWebhookEvent(event: any): Promise<void> {
    const { type, data } = event;

    logger.info('Processing webhook event', { type, eventId: event.id });

    try {
      switch (type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(data.object);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentCancelled(data.object);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(data.object);
          break;

        default:
          logger.info('Unhandled webhook event type', { type });
      }
    } catch (error) {
      logger.error('Failed to process webhook event', { type, error });
      throw error;
    }
  }

  private async handlePaymentSucceeded(paymentIntent: any): Promise<void> {
    const payment = await this.paymentRepository.findByStripePaymentIntentId(paymentIntent.id);

    if (!payment) {
      logger.warn('Payment not found for webhook event', { paymentIntentId: paymentIntent.id });
      return;
    }

    await this.paymentRepository.updateStatus(payment.id, PaymentStatus.SUCCEEDED);

    // Publish event
    if (this.rabbitmq) {
      await this.rabbitmq.publish('ecommerce.events', 'payment.succeeded', {
        id: crypto.randomUUID(),
        type: PaymentEventType.SUCCEEDED,
        timestamp: new Date().toISOString(),
        source: 'payment-service',
        data: {
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: Number(payment.amount),
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
        },
      });
    }

    logger.info('Payment succeeded via webhook', { paymentId: payment.id });
  }

  private async handlePaymentFailed(paymentIntent: any): Promise<void> {
    const payment = await this.paymentRepository.findByStripePaymentIntentId(paymentIntent.id);

    if (!payment) {
      logger.warn('Payment not found for webhook event', { paymentIntentId: paymentIntent.id });
      return;
    }

    await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.FAILED,
      errorMessage: paymentIntent.last_payment_error?.message,
      failedAt: new Date(),
    });

    // Publish event
    if (this.rabbitmq) {
      await this.rabbitmq.publish('ecommerce.events', 'payment.failed', {
        id: crypto.randomUUID(),
        type: PaymentEventType.FAILED,
        timestamp: new Date().toISOString(),
        source: 'payment-service',
        data: {
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: Number(payment.amount),
          currency: payment.currency,
          errorMessage: paymentIntent.last_payment_error?.message,
        },
      });
    }

    logger.info('Payment failed via webhook', { paymentId: payment.id });
  }

  private async handlePaymentCancelled(paymentIntent: any): Promise<void> {
    const payment = await this.paymentRepository.findByStripePaymentIntentId(paymentIntent.id);

    if (!payment) return;

    await this.paymentRepository.updateStatus(payment.id, PaymentStatus.CANCELLED);
  }

  private async handleChargeRefunded(charge: any): Promise<void> {
    // Handle refund via webhook if needed
    logger.info('Charge refunded via webhook', { chargeId: charge.id });
  }

  private mapStripeStatus(stripeStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'requires_payment_method': PaymentStatus.PENDING,
      'requires_confirmation': PaymentStatus.PENDING,
      'requires_action': PaymentStatus.REQUIRES_ACTION,
      'processing': PaymentStatus.PROCESSING,
      'succeeded': PaymentStatus.SUCCEEDED,
      'canceled': PaymentStatus.CANCELLED,
    };

    return statusMap[stripeStatus] || PaymentStatus.PENDING;
  }
}
