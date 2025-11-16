/**
 * Refresh Token Repository
 */

import { RefreshToken, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class RefreshTokenRepository {
  /**
   * Create new refresh token
   */
  async create(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return await prisma.refreshToken.create({
      data,
    });
  }

  /**
   * Find token by value
   */
  async findByToken(token: string): Promise<RefreshToken | null> {
    return await prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find active tokens for user
   */
  async findActiveByUserId(userId: string): Promise<RefreshToken[]> {
    return await prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Revoke token
   */
  async revoke(id: string, replacedBy?: string): Promise<RefreshToken> {
    return await prisma.refreshToken.update({
      where: { id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        replacedBy,
      },
    });
  }

  /**
   * Revoke all user tokens
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    const result = await prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Delete expired tokens
   */
  async deleteExpired(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            isRevoked: true,
            revokedAt: {
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            },
          },
        ],
      },
    });

    return result.count;
  }
}
