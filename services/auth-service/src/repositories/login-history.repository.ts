/**
 * Login History Repository
 */

import { LoginHistory, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class LoginHistoryRepository {
  /**
   * Create login history entry
   */
  async create(data: Prisma.LoginHistoryCreateInput): Promise<LoginHistory> {
    return await prisma.loginHistory.create({
      data,
    });
  }

  /**
   * Find by user ID
   */
  async findByUserId(userId: string, limit: number = 50): Promise<LoginHistory[]> {
    return await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Find failed login attempts
   */
  async findFailedAttempts(userId: string, since: Date): Promise<LoginHistory[]> {
    return await prisma.loginHistory.findMany({
      where: {
        userId,
        success: false,
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Count failed attempts by IP
   */
  async countFailedAttemptsByIP(ipAddress: string, since: Date): Promise<number> {
    return await prisma.loginHistory.count({
      where: {
        ipAddress,
        success: false,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  /**
   * Delete old history
   */
  async deleteOlderThan(days: number): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const result = await prisma.loginHistory.deleteMany({
      where: {
        createdAt: {
          lt: date,
        },
      },
    });

    return result.count;
  }
}
