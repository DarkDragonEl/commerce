/**
 * Stripe Mock Client - For development without Stripe API
 *
 * Reglas de simulación:
 * - Tarjetas terminadas en número PAR (0,2,4,6,8) → APROBADAS
 * - Tarjetas terminadas en número IMPAR (1,3,5,7,9) → RECHAZADAS
 * - Simula delays realistas
 * - No requiere API keys
 */

import { logger } from '@ecommerce/shared';

interface MockPaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled';
  customer?: string;
  payment_method?: string;
  description?: string;
  metadata?: Record<string, string>;
  created: number;
  client_secret: string;
}

interface MockRefund {
  id: string;
  amount: number;
  payment_intent: string;
  status: 'succeeded' | 'failed' | 'pending';
  reason?: string;
  metadata?: Record<string, string>;
  created: number;
}

interface MockCustomer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
  created: number;
}

interface MockPaymentMethod {
  id: string;
  type: 'card';
  card: {
    last4: string;
    brand: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details?: {
    name?: string;
    email?: string;
  };
  customer?: string;
  created: number;
}

export class StripeMockClient {
  private paymentIntents: Map<string, MockPaymentIntent> = new Map();
  private refunds: Map<string, MockRefund> = new Map();
  private customers: Map<string, MockCustomer> = new Map();
  private paymentMethods: Map<string, MockPaymentMethod> = new Map();

  constructor() {
    logger.info('🎭 Stripe Mock Client initialized - Using mock payment processor');
  }

  /**
   * Simula delay de red
   */
  private async simulateDelay(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Genera ID único
   */
  private generateId(prefix: string): string {
    return `${prefix}_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determina si una tarjeta debe ser aprobada
   * Regla: tarjetas terminadas en número par → aprobadas
   */
  private shouldApproveCard(cardNumber?: string): boolean {
    if (!cardNumber) return true; // Sin tarjeta, aprobar por defecto
    const lastDigit = parseInt(cardNumber.slice(-1), 10);
    return lastDigit % 2 === 0;
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customer?: string;
    payment_method?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<MockPaymentIntent> {
    await this.simulateDelay(150);

    const id = this.generateId('pi');
    const paymentIntent: MockPaymentIntent = {
      id,
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      status: 'requires_payment_method',
      customer: params.customer,
      payment_method: params.payment_method,
      description: params.description,
      metadata: params.metadata,
      created: Math.floor(Date.now() / 1000),
      client_secret: `${id}_secret_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.paymentIntents.set(id, paymentIntent);

    logger.info('🎭 Mock Payment Intent created', {
      paymentIntentId: id,
      amount: params.amount,
      currency: params.currency
    });

    return paymentIntent;
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<MockPaymentIntent> {
    await this.simulateDelay(200);

    const paymentIntent = this.paymentIntents.get(paymentIntentId);
    if (!paymentIntent) {
      throw new Error(`Payment intent ${paymentIntentId} not found`);
    }

    // Obtener método de pago
    const pmId = paymentMethodId || paymentIntent.payment_method;
    const paymentMethod = pmId ? this.paymentMethods.get(pmId) : null;

    // Determinar si aprobar o rechazar
    const cardNumber = paymentMethod?.card.last4 || '0000';
    const shouldApprove = this.shouldApproveCard(cardNumber);

    if (shouldApprove) {
      paymentIntent.status = 'succeeded';
      paymentIntent.payment_method = pmId;

      logger.info('✅ Mock Payment APPROVED', {
        paymentIntentId,
        amount: paymentIntent.amount,
        cardLast4: cardNumber
      });
    } else {
      // Simular rechazo
      logger.warn('❌ Mock Payment DECLINED', {
        paymentIntentId,
        amount: paymentIntent.amount,
        cardLast4: cardNumber,
        reason: 'Card number ends in odd digit (mock rule)'
      });
      throw new Error('Your card was declined. (Mock: card ends in odd digit)');
    }

    return paymentIntent;
  }

  /**
   * Retrieve payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<MockPaymentIntent> {
    await this.simulateDelay(50);

    const paymentIntent = this.paymentIntents.get(paymentIntentId);
    if (!paymentIntent) {
      throw new Error(`Payment intent ${paymentIntentId} not found`);
    }

    return paymentIntent;
  }

  /**
   * Cancel payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<MockPaymentIntent> {
    await this.simulateDelay(100);

    const paymentIntent = this.paymentIntents.get(paymentIntentId);
    if (!paymentIntent) {
      throw new Error(`Payment intent ${paymentIntentId} not found`);
    }

    paymentIntent.status = 'canceled';
    logger.info('🎭 Mock Payment Intent cancelled', { paymentIntentId });

    return paymentIntent;
  }

  /**
   * Create refund
   */
  async createRefund(params: {
    paymentIntentId?: string;
    chargeId?: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata?: Record<string, string>;
  }): Promise<MockRefund> {
    await this.simulateDelay(150);

    const paymentIntentId = params.paymentIntentId || params.chargeId;
    if (!paymentIntentId) {
      throw new Error('Either paymentIntentId or chargeId is required');
    }

    const paymentIntent = this.paymentIntents.get(paymentIntentId);
    if (!paymentIntent) {
      throw new Error(`Payment intent ${paymentIntentId} not found`);
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Can only refund succeeded payments');
    }

    const id = this.generateId('re');
    const refund: MockRefund = {
      id,
      amount: params.amount || paymentIntent.amount,
      payment_intent: paymentIntentId,
      status: 'succeeded',
      reason: params.reason,
      metadata: params.metadata,
      created: Math.floor(Date.now() / 1000),
    };

    this.refunds.set(id, refund);

    logger.info('🎭 Mock Refund created', {
      refundId: id,
      paymentIntentId,
      amount: refund.amount
    });

    return refund;
  }

  /**
   * Retrieve refund
   */
  async getRefund(refundId: string): Promise<MockRefund> {
    await this.simulateDelay(50);

    const refund = this.refunds.get(refundId);
    if (!refund) {
      throw new Error(`Refund ${refundId} not found`);
    }

    return refund;
  }

  /**
   * Create customer
   */
  async createCustomer(params: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }): Promise<MockCustomer> {
    await this.simulateDelay(100);

    const id = this.generateId('cus');
    const customer: MockCustomer = {
      id,
      email: params.email,
      name: params.name,
      phone: params.phone,
      metadata: params.metadata,
      created: Math.floor(Date.now() / 1000),
    };

    this.customers.set(id, customer);

    logger.info('🎭 Mock Customer created', { customerId: id, email: params.email });

    return customer;
  }

  /**
   * Retrieve customer
   */
  async getCustomer(customerId: string): Promise<MockCustomer> {
    await this.simulateDelay(50);

    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    return customer;
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
    };
  }): Promise<MockPaymentMethod> {
    await this.simulateDelay(100);

    const id = this.generateId('pm');
    const paymentMethod: MockPaymentMethod = {
      id,
      type: 'card',
      card: {
        last4: params.card.number.slice(-4),
        brand: this.detectCardBrand(params.card.number),
        exp_month: params.card.exp_month,
        exp_year: params.card.exp_year,
      },
      billing_details: params.billing_details,
      created: Math.floor(Date.now() / 1000),
    };

    this.paymentMethods.set(id, paymentMethod);

    logger.info('🎭 Mock Payment Method created', {
      paymentMethodId: id,
      last4: paymentMethod.card.last4
    });

    return paymentMethod;
  }

  /**
   * Detecta marca de tarjeta
   */
  private detectCardBrand(cardNumber: string): string {
    const firstDigit = cardNumber[0];
    switch (firstDigit) {
      case '4': return 'visa';
      case '5': return 'mastercard';
      case '3': return 'amex';
      case '6': return 'discover';
      default: return 'unknown';
    }
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<MockPaymentMethod> {
    await this.simulateDelay(50);

    const paymentMethod = this.paymentMethods.get(paymentMethodId);
    if (!paymentMethod) {
      throw new Error(`Payment method ${paymentMethodId} not found`);
    }

    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    paymentMethod.customer = customerId;

    logger.info('🎭 Mock Payment Method attached', { paymentMethodId, customerId });

    return paymentMethod;
  }

  /**
   * Detach payment method
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<MockPaymentMethod> {
    await this.simulateDelay(50);

    const paymentMethod = this.paymentMethods.get(paymentMethodId);
    if (!paymentMethod) {
      throw new Error(`Payment method ${paymentMethodId} not found`);
    }

    delete paymentMethod.customer;

    logger.info('🎭 Mock Payment Method detached', { paymentMethodId });

    return paymentMethod;
  }

  /**
   * List customer payment methods
   */
  async listCustomerPaymentMethods(customerId: string): Promise<MockPaymentMethod[]> {
    await this.simulateDelay(50);

    const methods = Array.from(this.paymentMethods.values())
      .filter(pm => pm.customer === customerId);

    return methods;
  }

  /**
   * Construct webhook event (mock - siempre retorna evento válido)
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): any {
    logger.info('🎭 Mock Webhook event constructed (always valid)');

    // Mock event structure
    return {
      id: this.generateId('evt'),
      type: 'payment_intent.succeeded',
      data: {
        object: JSON.parse(payload.toString()),
      },
      created: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Get mock instance (for compatibility)
   */
  getStripe(): any {
    return {
      paymentIntents: this,
      refunds: this,
      customers: this,
      paymentMethods: this,
      webhooks: this,
    };
  }
}

// Export singleton instance
export const stripeMockClient = new StripeMockClient();
