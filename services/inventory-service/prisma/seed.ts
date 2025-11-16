import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Inventory service - no seed data required');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
