/**
 * Auth Service Database Seed
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@ecommerce/shared';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seeding...');

  // Note: Users are managed in Keycloak
  // This seed file is for reference and can be used to create test data

  logger.info('📝 Seed data notes:');
  logger.info('- Users are managed in Keycloak');
  logger.info('- Use Keycloak Admin Console to create test users');
  logger.info('- Sessions and tokens are created automatically on login');

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
