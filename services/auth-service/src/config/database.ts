/**
 * Database configuration and connection
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@ecommerce/shared';
import { env } from './env';

// Create Prisma client instance
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
  errorFormat: 'pretty',
});

/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database health check passed');
  } catch (error) {
    logger.error('❌ Failed to connect to database', error);
    throw error;
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting from database', error);
    throw error;
  }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{ status: 'up' | 'down' }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'up' };
  } catch (error) {
    logger.error('Database health check failed', error);
    return { status: 'down' };
  }
}
