/**
 * Order Service Database Seed
 */

import { PrismaClient, OrderStatus } from '@prisma/client';
import { logger } from '@ecommerce/shared';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seeding...');

  // Note: Sample data for testing
  logger.info('📝 Creating sample orders...');

  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: 'ORD-20240101-0001',
      userId: '00000000-0000-0000-0000-000000000001',
      userEmail: 'john@example.com',
      status: OrderStatus.PENDING,
      subtotal: 99.99,
      taxAmount: 10.00,
      shippingCost: 10.00,
      discountAmount: 0,
      total: 119.99,
      currency: 'USD',
      customerName: 'John Doe',
      items: {
        create: [
          {
            productId: '00000000-0000-0000-0000-000000000001',
            productSku: 'SAMPLE-001',
            productName: 'Sample Product',
            quantity: 1,
            unitPrice: 99.99,
            subtotal: 99.99,
            taxAmount: 10.00,
            total: 109.99,
          },
        ],
      },
      shippingAddress: {
        create: {
          type: 'shipping',
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
        },
      },
    },
  });

  logger.info(`Created sample order: ${sampleOrder.orderNumber}`);

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
