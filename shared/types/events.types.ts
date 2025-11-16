/**
 * Event types for inter-service communication via RabbitMQ
 */

export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  correlationId?: string;
}

// ========================================
// PRODUCT EVENTS
// ========================================

export enum ProductEventType {
  CREATED = 'product.created',
  UPDATED = 'product.updated',
  DELETED = 'product.deleted',
  STOCK_CHANGED = 'product.stock.changed',
  PRICE_CHANGED = 'product.price.changed',
  ACTIVATED = 'product.activated',
  DEACTIVATED = 'product.deactivated',
}

export interface ProductCreatedEvent extends BaseEvent {
  type: ProductEventType.CREATED;
  data: {
    productId: string;
    sku: string;
    name: string;
    price: number;
    categoryId?: string;
    stock?: number;
  };
}

export interface ProductUpdatedEvent extends BaseEvent {
  type: ProductEventType.UPDATED;
  data: {
    productId: string;
    sku: string;
    changes: Record<string, any>;
  };
}

export interface ProductStockChangedEvent extends BaseEvent {
  type: ProductEventType.STOCK_CHANGED;
  data: {
    productId: string;
    sku: string;
    previousStock: number;
    newStock: number;
    reason: 'sale' | 'restock' | 'adjustment' | 'return';
  };
}

// ========================================
// ORDER EVENTS
// ========================================

export enum OrderEventType {
  CREATED = 'order.created',
  CONFIRMED = 'order.confirmed',
  PAID = 'order.paid',
  PROCESSING = 'order.processing',
  SHIPPED = 'order.shipped',
  DELIVERED = 'order.delivered',
  CANCELLED = 'order.cancelled',
  REFUNDED = 'order.refunded',
}

export interface OrderCreatedEvent extends BaseEvent {
  type: OrderEventType.CREATED;
  data: {
    orderId: string;
    orderNumber: string;
    userId: string;
    email: string;
    total: number;
    currency: string;
    items: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      price: number;
    }>;
  };
}

export interface OrderPaidEvent extends BaseEvent {
  type: OrderEventType.PAID;
  data: {
    orderId: string;
    orderNumber: string;
    paymentId: string;
    amount: number;
    currency: string;
  };
}

export interface OrderShippedEvent extends BaseEvent {
  type: OrderEventType.SHIPPED;
  data: {
    orderId: string;
    orderNumber: string;
    trackingNumber: string;
    carrier: string;
    shippedAt: string;
  };
}

// ========================================
// USER EVENTS
// ========================================

export enum UserEventType {
  REGISTERED = 'user.registered',
  EMAIL_VERIFIED = 'user.email_verified',
  PASSWORD_CHANGED = 'user.password_changed',
  PROFILE_UPDATED = 'user.profile_updated',
  DELETED = 'user.deleted',
}

export interface UserRegisteredEvent extends BaseEvent {
  type: UserEventType.REGISTERED;
  data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface UserEmailVerifiedEvent extends BaseEvent {
  type: UserEventType.EMAIL_VERIFIED;
  data: {
    userId: string;
    email: string;
  };
}

// ========================================
// PAYMENT EVENTS
// ========================================

export enum PaymentEventType {
  CREATED = 'payment.created',
  SUCCEEDED = 'payment.succeeded',
  FAILED = 'payment.failed',
  REFUNDED = 'payment.refunded',
}

export interface PaymentSucceededEvent extends BaseEvent {
  type: PaymentEventType.SUCCEEDED;
  data: {
    paymentId: string;
    orderId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
  };
}

export interface PaymentFailedEvent extends BaseEvent {
  type: PaymentEventType.FAILED;
  data: {
    paymentId: string;
    orderId: string;
    amount: number;
    currency: string;
    errorMessage: string;
  };
}

// ========================================
// INVENTORY EVENTS
// ========================================

export enum InventoryEventType {
  RESERVED = 'inventory.reserved',
  RELEASED = 'inventory.released',
  COMMITTED = 'inventory.committed',
  LOW_STOCK = 'inventory.low_stock',
  OUT_OF_STOCK = 'inventory.out_of_stock',
}

export interface InventoryReservedEvent extends BaseEvent {
  type: InventoryEventType.RESERVED;
  data: {
    reservationId: string;
    productId: string;
    variantId?: string;
    quantity: number;
    orderId?: string;
  };
}

export interface InventoryLowStockEvent extends BaseEvent {
  type: InventoryEventType.LOW_STOCK;
  data: {
    productId: string;
    sku: string;
    currentStock: number;
    threshold: number;
  };
}

// ========================================
// EMAIL EVENTS
// ========================================

export enum EmailEventType {
  SEND = 'email.send',
  SENT = 'email.sent',
  FAILED = 'email.failed',
  BOUNCED = 'email.bounced',
}

export interface SendEmailEvent extends BaseEvent {
  type: EmailEventType.SEND;
  data: {
    to: string | string[];
    from?: string;
    subject: string;
    template: string;
    variables: Record<string, any>;
    attachments?: Array<{
      filename: string;
      content: string;
      contentType?: string;
    }>;
  };
}

// ========================================
// UNION TYPES
// ========================================

export type ProductEvent =
  | ProductCreatedEvent
  | ProductUpdatedEvent
  | ProductStockChangedEvent;

export type OrderEvent =
  | OrderCreatedEvent
  | OrderPaidEvent
  | OrderShippedEvent;

export type UserEvent =
  | UserRegisteredEvent
  | UserEmailVerifiedEvent;

export type PaymentEvent =
  | PaymentSucceededEvent
  | PaymentFailedEvent;

export type InventoryEvent =
  | InventoryReservedEvent
  | InventoryLowStockEvent;

export type EmailEvent = SendEmailEvent;

export type DomainEvent =
  | ProductEvent
  | OrderEvent
  | UserEvent
  | PaymentEvent
  | InventoryEvent
  | EmailEvent;
