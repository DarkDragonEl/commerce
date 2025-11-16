/**
 * Transaction Repository
 */

import { Transaction, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class TransactionRepository {
  async create(data: Prisma.TransactionCreateInput): Promise<Transaction> {
    return await prisma.transaction.create({ data });
  }

  async findByPaymentId(paymentId: string): Promise<Transaction[]> {
    return await prisma.transaction.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLog(
    paymentId: string,
    type: string,
    amount: number,
    status: string,
    success: boolean,
    details?: {
      externalId?: string;
      externalType?: string;
      description?: string;
      errorCode?: string;
      errorMessage?: string;
      metadata?: any;
    }
  ): Promise<Transaction> {
    return await this.create({
      payment: { connect: { id: paymentId } },
      type,
      amount,
      currency: 'USD',
      status,
      success,
      ...details,
    });
  }
}
