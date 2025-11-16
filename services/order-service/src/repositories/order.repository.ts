/**
 * Order Repository
 */

import { Order, OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class OrderRepository {
  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    return await prisma.order.create({
      data,
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
        payments: true,
      },
    });
  }

  async findById(id: string): Promise<Order | null> {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
        payments: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
        payments: true,
      },
    });
  }

  async findByUserId(userId: string, limit: number = 50): Promise<Order[]> {
    return await prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.OrderWhereInput;
    orderBy?: Prisma.OrderOrderByWithRelationInput;
  }): Promise<Order[]> {
    return await prisma.order.findMany({
      ...params,
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
      },
    });
  }

  async count(where?: Prisma.OrderWhereInput): Promise<number> {
    return await prisma.order.count({ where });
  }

  async update(id: string, data: Prisma.OrderUpdateInput): Promise<Order> {
    return await prisma.order.update({
      where: { id },
      data,
      include: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
        payments: true,
      },
    });
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const now = new Date();
    const updates: Prisma.OrderUpdateInput = { status };

    // Set timestamps based on status
    if (status === OrderStatus.CONFIRMED) updates.confirmedAt = now;
    if (status === OrderStatus.PAID) updates.paidAt = now;
    if (status === OrderStatus.SHIPPED) updates.shippedAt = now;
    if (status === OrderStatus.DELIVERED) updates.deliveredAt = now;
    if (status === OrderStatus.CANCELLED) updates.cancelledAt = now;
    if (status === OrderStatus.COMPLETED) updates.completedAt = now;

    return await this.update(id, updates);
  }

  async delete(id: string): Promise<Order> {
    return await prisma.order.delete({
      where: { id },
    });
  }

  async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    // Count orders today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `ORD-${year}${month}${day}-${sequence}`;
  }
}
