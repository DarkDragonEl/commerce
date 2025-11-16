import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { initLogger, logger, initRedis, initRabbitMQ, getRabbitMQ } from '@ecommerce/shared';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './config/database';
import { InventoryService } from './services/inventory.service';

async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors);
  await app.register(swagger, {
    openapi: { info: { title: 'Inventory Service API', version: '1.0.0' } },
  });
  await app.register(swaggerUi, { routePrefix: '/api-docs' });

  const rabbitmq = getRabbitMQ();
  const inventoryService = new InventoryService(rabbitmq);

  // Reserve stock
  app.post('/api/v1/inventory/reserve', async (request, reply) => {
    const { productId, quantity, orderId } = request.body as any;
    const reservation = await inventoryService.reserve(productId, quantity, orderId);
    return reply.status(201).send({ success: true, data: { reservation } });
  });

  // Confirm reservation
  app.post('/api/v1/inventory/reservations/:id/confirm', async (request, reply) => {
    const { id } = request.params as any;
    const reservation = await inventoryService.confirmReservation(id);
    return reply.send({ success: true, data: { reservation } });
  });

  // Release reservation
  app.post('/api/v1/inventory/reservations/:id/release', async (request, reply) => {
    const { id } = request.params as any;
    const reservation = await inventoryService.releaseReservation(id);
    return reply.send({ success: true, data: { reservation } });
  });

  // Adjust stock
  app.post('/api/v1/inventory/:productId/adjust', async (request, reply) => {
    const { productId } = request.params as any;
    const { quantity, reason } = request.body as any;
    const item = await inventoryService.adjustStock(productId, quantity, reason);
    return reply.send({ success: true, data: { item } });
  });

  // Get inventory
  app.get('/api/v1/inventory/:productId', async (request, reply) => {
    const { productId } = request.params as any;
    const item = await inventoryService.getInventory(productId);
    return reply.send({ success: true, data: { item } });
  });

  // Check low stock
  app.get('/api/v1/inventory/low-stock', async (request, reply) => {
    const items = await inventoryService.checkLowStock();
    return reply.send({ success: true, data: { items } });
  });

  app.get('/health', async () => ({ status: 'healthy', service: env.SERVICE_NAME }));
  app.get('/health/ready', async (request, reply) => {
    const dbHealth = await checkDatabaseHealth();
    if (dbHealth.status === 'down') {
      return reply.status(503).send({ status: 'not ready', checks: { database: dbHealth } });
    }
    return reply.send({ status: 'ready', checks: { database: dbHealth } });
  });

  // Subscribe to events
  if (rabbitmq) {
    await rabbitmq.subscribe('ecommerce.events', 'order.created', async (event) => {
      logger.info('Order created event received', { orderId: event.data.orderId });
      for (const item of event.data.items) {
        await inventoryService.reserve(item.productId, item.quantity, event.data.orderId);
      }
    });

    await rabbitmq.subscribe('ecommerce.events', 'order.cancelled', async (event) => {
      // Release reservations for cancelled orders
      logger.info('Order cancelled event received', { orderId: event.data.orderId });
    });
  }

  return app;
}

async function start() {
  try {
    initLogger({ serviceName: env.SERVICE_NAME, logLevel: env.LOG_LEVEL, logFormat: env.LOG_FORMAT });
    logger.info('🚀 Starting Inventory Service...');

    await connectDatabase();
    initRedis({ url: env.REDIS_URL, db: env.REDIS_DB });

    const rabbitmq = initRabbitMQ({ url: env.RABBITMQ_URL, serviceName: env.SERVICE_NAME });
    await rabbitmq.connect();
    await rabbitmq.setupExchange('ecommerce.events', 'topic');

    const app = await buildApp();
    await app.listen({ port: env.PORT, host: '0.0.0.0' });

    logger.info(`✅ Inventory Service listening on port ${env.PORT}`);

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down...`);
      await app.close();
      await disconnectDatabase();
      await rabbitmq.disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('💥 Failed to start', error);
    process.exit(1);
  }
}

start();
