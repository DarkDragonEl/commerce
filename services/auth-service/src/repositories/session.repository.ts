/**
 * Session Repository
 */

import { Session, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class SessionRepository {
  /**
   * Create new session
   */
  async create(data: Prisma.SessionCreateInput): Promise<Session> {
    return await prisma.session.create({
      data,
    });
  }

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<Session | null> {
    return await prisma.session.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find session by token
   */
  async findByToken(sessionToken: string): Promise<Session | null> {
    return await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: true,
      },
    });
  }

  /**
   * Find active sessions for user
   */
  async findActiveByUserId(userId: string): Promise<Session[]> {
    return await prisma.session.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        lastActivity: 'desc',
      },
    });
  }

  /**
   * Update session
   */
  async update(id: string, data: Prisma.SessionUpdateInput): Promise<Session> {
    return await prisma.session.update({
      where: { id },
      data,
    });
  }

  /**
   * Update last activity
   */
  async updateActivity(id: string): Promise<Session> {
    return await prisma.session.update({
      where: { id },
      data: {
        lastActivity: new Date(),
      },
    });
  }

  /**
   * Invalidate session
   */
  async invalidate(id: string): Promise<Session> {
    return await prisma.session.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Invalidate all user sessions
   */
  async invalidateAllUserSessions(userId: string): Promise<number> {
    const result = await prisma.session.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    return result.count;
  }

  /**
   * Delete expired sessions
   */
  async deleteExpired(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }
}
