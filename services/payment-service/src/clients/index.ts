/**
 * Payment client factory
 * Automatically uses mock client when STRIPE_MOCK=true
 */

import { env } from '../config/env';
import { StripeClient } from './stripe.client';
import { StripeMockClient } from './stripe-mock.client';
import { logger } from '@ecommerce/shared';

// Type-compatible interface for both real and mock clients
export interface IPaymentClient {
  createPaymentIntent(params: any): Promise<any>;
  confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<any>;
  getPaymentIntent(paymentIntentId: string): Promise<any>;
  cancelPaymentIntent(paymentIntentId: string): Promise<any>;
  createRefund(params: any): Promise<any>;
  getRefund(refundId: string): Promise<any>;
  createCustomer(params: any): Promise<any>;
  getCustomer(customerId: string): Promise<any>;
  createPaymentMethod(params: any): Promise<any>;
  attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<any>;
  detachPaymentMethod(paymentMethodId: string): Promise<any>;
  listCustomerPaymentMethods(customerId: string, type?: string): Promise<any>;
  constructWebhookEvent(payload: string | Buffer, signature: string, secret: string): any;
  getStripe(): any;
}

/**
 * Get payment client based on configuration
 */
function getPaymentClient(): IPaymentClient {
  if (env.STRIPE_MOCK) {
    logger.info('🎭 Using MOCK Payment Client - No real charges will be made');
    logger.info('💡 Mock Rules: Cards ending in EVEN digit → APPROVED, ODD digit → DECLINED');
    return new StripeMockClient() as any;
  } else {
    logger.info('💳 Using REAL Stripe Payment Client');
    return new StripeClient() as any;
  }
}

// Export singleton instance
export const paymentClient = getPaymentClient();
