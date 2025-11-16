/**
 * Payment Service Database Seed
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@ecommerce/shared';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seeding...');

  // Note: Sample data would go here
  logger.info('📝 Payment service seed data notes:');
  logger.info('- Payments are created dynamically via API');
  logger.info('- Connect to Stripe for live data');

  logger.info('✅ Database seeding completed');
}

main()
  .catch((error) => {
    logger.error('❌ Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
