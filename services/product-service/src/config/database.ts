/**
 * Database configuration and Prisma client
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@ecommerce/shared';
import env from './env';

const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
  errorFormat: env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
});

// Middleware for logging queries
prisma.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  const duration = (after - before) / 1000;

  logger.debug('Database query executed', {
    model: params.model,
    action: params.action,
    duration: `${duration}s`,
  });

  return result;
});

// Connect to database
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Failed to connect to database', error as Error);
    throw error;
  }
}

// Disconnect from database
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting from database', error as Error);
    throw error;
  }
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed', error as Error);
    return false;
  }
}

export { prisma };
export default prisma;
