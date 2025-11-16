import { PrismaClient } from '@prisma/client';
import { logger } from '@ecommerce/shared';
import { env } from './env';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('✅ Database connected');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export async function checkDatabaseHealth(): Promise<{ status: 'up' | 'down' }> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'up' };
  } catch (error) {
    return { status: 'down' };
  }
}
