import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Email service - no seed data required');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
