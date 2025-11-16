/**
 * User Repository
 */

import { User, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export class UserRepository {
  /**
   * Create new user
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return await prisma.user.create({
      data,
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by Keycloak ID
   */
  async findByKeycloakId(keycloakId: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { keycloakId },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * Update user
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<User> {
    return await prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Sync user from Keycloak
   */
  async syncFromKeycloak(keycloakId: string, data: {
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    emailVerified: boolean;
    enabled: boolean;
  }): Promise<User> {
    return await prisma.user.upsert({
      where: { keycloakId },
      create: {
        keycloakId,
        ...data,
      },
      update: data,
    });
  }
}
