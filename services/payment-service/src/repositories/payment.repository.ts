/**
 * Payment Repository
 */

import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class PaymentRepository {
  async create(data: Prisma.PaymentCreateInput): Promise<Payment> {
    return await prisma.payment.create({
      data,
      include: {
        refunds: true,
        transactions: true,
      },
    });
  }

  async findById(id: string): Promise<Payment | null> {
    return await prisma.payment.findUnique({
      where: { id },
      include: {
        refunds: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    return await prisma.payment.findFirst({
      where: { orderId },
      include: {
        refunds: true,
        transactions: true,
      },
    });
  }

  async findByStripePaymentIntentId(stripePaymentIntentId: string): Promise<Payment | null> {
    return await prisma.payment.findUnique({
      where: { stripePaymentIntentId },
      include: {
        refunds: true,
        transactions: true,
      },
    });
  }

  async findByUserId(userId: string, limit: number = 50): Promise<Payment[]> {
    return await prisma.payment.findMany({
      where: { userId },
      include: {
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async update(id: string, data: Prisma.PaymentUpdateInput): Promise<Payment> {
    return await prisma.payment.update({
      where: { id },
      data,
      include: {
        refunds: true,
        transactions: true,
      },
    });
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
    const now = new Date();
    const updates: Prisma.PaymentUpdateInput = { status };

    if (status === PaymentStatus.PROCESSING) updates.processedAt = now;
    if (status === PaymentStatus.SUCCEEDED) updates.succeededAt = now;
    if (status === PaymentStatus.FAILED) updates.failedAt = now;
    if (status === PaymentStatus.CANCELLED) updates.cancelledAt = now;

    return await this.update(id, updates);
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.PaymentWhereInput;
  }): Promise<Payment[]> {
    return await prisma.payment.findMany({
      ...params,
      include: {
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(where?: Prisma.PaymentWhereInput): Promise<number> {
    return await prisma.payment.count({ where });
  }
}
