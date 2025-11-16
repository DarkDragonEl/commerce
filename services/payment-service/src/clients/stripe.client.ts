/**
 * Stripe Client
 */

import Stripe from 'stripe';
import { logger } from '@ecommerce/shared';
import { env } from '../config/env';

export class StripeClient {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: env.STRIPE_API_VERSION as any,
      typescript: true,
    });
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(params: {
    amount: number; // in cents
    currency: string;
    customerId?: string;
    paymentMethodId?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency.toLowerCase(),
        customer: params.customerId,
        payment_method: params.paymentMethodId,
        description: params.description,
        metadata: params.metadata,
        automatic_payment_methods: params.paymentMethodId ? undefined : {
          enabled: true,
        },
      });

      logger.info('Payment intent created', { paymentIntentId: paymentIntent.id });
      return paymentIntent;
    } catch (error) {
      logger.error('Failed to create payment intent', error);
      throw error;
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      logger.info('Payment intent confirmed', { paymentIntentId });
      return paymentIntent;
    } catch (error) {
      logger.error('Failed to confirm payment intent', error);
      throw error;
    }
  }

  /**
   * Retrieve payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      logger.error('Failed to retrieve payment intent', error);
      throw error;
    }
  }

  /**
   * Cancel payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      logger.info('Payment intent cancelled', { paymentIntentId });
      return paymentIntent;
    } catch (error) {
      logger.error('Failed to cancel payment intent', error);
      throw error;
    }
  }

  /**
   * Create refund
   */
  async createRefund(params: {
    paymentIntentId?: string;
    chargeId?: string;
    amount?: number; // in cents, optional for partial refund
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        charge: params.chargeId,
        amount: params.amount,
        reason: params.reason,
        metadata: params.metadata,
      });

      logger.info('Refund created', { refundId: refund.id });
      return refund;
    } catch (error) {
      logger.error('Failed to create refund', error);
      throw error;
    }
  }

  /**
   * Retrieve refund
   */
  async getRefund(refundId: string): Promise<Stripe.Refund> {
    try {
      return await this.stripe.refunds.retrieve(refundId);
    } catch (error) {
      logger.error('Failed to retrieve refund', error);
      throw error;
    }
  }

  /**
   * Create customer
   */
  async createCustomer(params: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create(params);
      logger.info('Customer created', { customerId: customer.id });
      return customer;
    } catch (error) {
      logger.error('Failed to create customer', error);
      throw error;
    }
  }

  /**
   * Retrieve customer
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      logger.error('Failed to retrieve customer', error);
      throw error;
    }
  }

  /**
   * Create payment method
   */
  async createPaymentMethod(params: {
    type: 'card';
    card: {
      number: string;
      exp_month: number;
      exp_year: number;
      cvc: string;
    };
    billing_details?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: Stripe.AddressParam;
    };
  }): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.create(params);
      logger.info('Payment method created', { paymentMethodId: paymentMethod.id });
      return paymentMethod;
    } catch (error) {
      logger.error('Failed to create payment method', error);
      throw error;
    }
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      logger.info('Payment method attached', { paymentMethodId, customerId });
      return paymentMethod;
    } catch (error) {
      logger.error('Failed to attach payment method', error);
      throw error;
    }
  }

  /**
   * Detach payment method from customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      logger.info('Payment method detached', { paymentMethodId });
      return paymentMethod;
    } catch (error) {
      logger.error('Failed to detach payment method', error);
      throw error;
    }
  }

  /**
   * List customer payment methods
   */
  async listCustomerPaymentMethods(
    customerId: string,
    type: 'card' = 'card'
  ): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type,
      });
      return paymentMethods.data;
    } catch (error) {
      logger.error('Failed to list payment methods', error);
      throw error;
    }
  }

  /**
   * Construct webhook event
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      logger.error('Failed to construct webhook event', error);
      throw error;
    }
  }

  /**
   * Get Stripe instance (for advanced usage)
   */
  getStripe(): Stripe {
    return this.stripe;
  }
}

// Export singleton instance
export const stripeClient = new StripeClient();
