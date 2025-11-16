/**
 * Order History Repository
 */

import { OrderHistory, OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class OrderHistoryRepository {
  async create(data: Prisma.OrderHistoryCreateInput): Promise<OrderHistory> {
    return await prisma.orderHistory.create({
      data,
    });
  }

  async findByOrderId(orderId: string): Promise<OrderHistory[]> {
    return await prisma.orderHistory.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTransition(
    orderId: string,
    fromStatus: OrderStatus | null,
    toStatus: OrderStatus,
    changedBy?: string,
    changeReason?: string,
    metadata?: any
  ): Promise<OrderHistory> {
    return await this.create({
      order: { connect: { id: orderId } },
      fromStatus,
      toStatus,
      changedBy,
      changeReason,
      metadata,
    });
  }
}
