/**
 * Refund Repository
 */

import { Refund, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class RefundRepository {
  async create(data: Prisma.RefundCreateInput): Promise<Refund> {
    return await prisma.refund.create({ data });
  }

  async findById(id: string): Promise<Refund | null> {
    return await prisma.refund.findUnique({
      where: { id },
      include: { payment: true },
    });
  }

  async findByPaymentId(paymentId: string): Promise<Refund[]> {
    return await prisma.refund.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByStripeRefundId(stripeRefundId: string): Promise<Refund | null> {
    return await prisma.refund.findUnique({
      where: { stripeRefundId },
    });
  }

  async update(id: string, data: Prisma.RefundUpdateInput): Promise<Refund> {
    return await prisma.refund.update({
      where: { id },
      data,
    });
  }
}
