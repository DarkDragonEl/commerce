/**
 * Order Service with State Machine
 */

import { Order, OrderStatus, Prisma } from '@prisma/client';
import {
  logger,
  RabbitMQClient,
  BadRequestError,
  NotFoundError,
  OrderEventType,
} from '@ecommerce/shared';
import { OrderRepository } from '../repositories/order.repository';
import { OrderHistoryRepository } from '../repositories/order-history.repository';
import { isValidTransition, getValidTransitions } from '../state-machine/order-machine';
import crypto from 'crypto';

export interface CreateOrderInput {
  userId: string;
  userEmail: string;
  items: Array<{
    productId: string;
    productSku: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  billingAddress?: typeof shippingAddress;
  customerName?: string;
  customerPhone?: string;
  customerNotes?: string;
}

export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private orderHistoryRepository: OrderHistoryRepository,
    private rabbitmq?: RabbitMQClient
  ) {}

  async createOrder(data: CreateOrderInput): Promise<Order> {
    // Generate order number
    const orderNumber = await this.orderRepository.generateOrderNumber();

    // Calculate totals
    let subtotal = 0;
    const items = data.items.map((item) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      subtotal += itemSubtotal;

      return {
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: itemSubtotal,
        taxAmount: 0,
        discountAmount: 0,
        total: itemSubtotal,
      };
    });

    const taxAmount = subtotal * 0.1; // 10% tax (simplified)
    const shippingCost = 10; // Flat rate (simplified)
    const total = subtotal + taxAmount + shippingCost;

    // Create order
    const order = await this.orderRepository.create({
      orderNumber,
      userId: data.userId,
      userEmail: data.userEmail,
      status: OrderStatus.PENDING,
      subtotal,
      taxAmount,
      shippingCost,
      discountAmount: 0,
      total,
      currency: 'USD',
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerNotes: data.customerNotes,
      items: {
        create: items,
      },
      shippingAddress: {
        create: {
          type: 'shipping',
          ...data.shippingAddress,
        },
      },
      billingAddress: data.billingAddress
        ? {
            create: {
              type: 'billing',
              ...data.billingAddress,
            },
          }
        : undefined,
    });

    // Create history entry
    await this.orderHistoryRepository.createTransition(
      order.id,
      null,
      OrderStatus.PENDING,
      data.userId,
      'Order created'
    );

    // Publish order created event
    if (this.rabbitmq) {
      await this.rabbitmq.publish('ecommerce.events', 'order.created', {
        id: crypto.randomUUID(),
        type: OrderEventType.CREATED,
        timestamp: new Date().toISOString(),
        source: 'order-service',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          email: order.userEmail,
          total: Number(order.total),
          currency: order.currency,
          items: order.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: Number(item.unitPrice),
          })),
        },
      });
    }

    logger.info('Order created', { orderId: order.id, orderNumber });

    return order;
  }

  async getOrder(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository.findByOrderNumber(orderNumber);

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  async getUserOrders(userId: string, limit?: number): Promise<Order[]> {
    return await this.orderRepository.findByUserId(userId, limit);
  }

  async listOrders(params: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    userId?: string;
  }): Promise<{ orders: Order[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.userId) where.userId = params.userId;

    const [orders, total] = await Promise.all([
      this.orderRepository.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.orderRepository.count(where),
    ]);

    return { orders, total };
  }

  async transitionStatus(
    orderId: string,
    toStatus: OrderStatus,
    userId?: string,
    reason?: string
  ): Promise<Order> {
    const order = await this.getOrder(orderId);

    // Validate transition
    if (!isValidTransition(order.status, toStatus)) {
      const validTransitions = getValidTransitions(order.status);
      throw new BadRequestError(
        `Invalid status transition from ${order.status} to ${toStatus}. ` +
        `Valid transitions: ${validTransitions.join(', ')}`
      );
    }

    // Update order status
    const updatedOrder = await this.orderRepository.updateStatus(orderId, toStatus);

    // Create history entry
    await this.orderHistoryRepository.createTransition(
      orderId,
      order.status,
      toStatus,
      userId,
      reason
    );

    // Publish event based on new status
    if (this.rabbitmq) {
      const eventType = this.getEventTypeForStatus(toStatus);
      if (eventType) {
        await this.rabbitmq.publish('ecommerce.events', eventType, {
          id: crypto.randomUUID(),
          type: eventType,
          timestamp: new Date().toISOString(),
          source: 'order-service',
          data: {
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            status: toStatus,
            previousStatus: order.status,
          },
        });
      }
    }

    logger.info('Order status updated', {
      orderId,
      from: order.status,
      to: toStatus,
    });

    return updatedOrder;
  }

  async cancelOrder(orderId: string, userId?: string, reason?: string): Promise<Order> {
    return await this.transitionStatus(orderId, OrderStatus.CANCELLED, userId, reason);
  }

  async getValidTransitions(orderId: string): Promise<OrderStatus[]> {
    const order = await this.getOrder(orderId);
    return getValidTransitions(order.status);
  }

  private getEventTypeForStatus(status: OrderStatus): string | null {
    const mapping: Record<OrderStatus, string | null> = {
      [OrderStatus.DRAFT]: null,
      [OrderStatus.PENDING]: OrderEventType.CREATED,
      [OrderStatus.PAYMENT_PENDING]: null,
      [OrderStatus.PAID]: OrderEventType.PAID,
      [OrderStatus.CONFIRMED]: OrderEventType.CONFIRMED,
      [OrderStatus.PROCESSING]: OrderEventType.PROCESSING,
      [OrderStatus.SHIPPED]: OrderEventType.SHIPPED,
      [OrderStatus.DELIVERED]: OrderEventType.DELIVERED,
      [OrderStatus.COMPLETED]: null,
      [OrderStatus.CANCELLED]: OrderEventType.CANCELLED,
      [OrderStatus.REFUNDED]: OrderEventType.REFUNDED,
      [OrderStatus.FAILED]: null,
    };

    return mapping[status];
  }
}
