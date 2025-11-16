/**
 * Product Service - Main Server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import env from './config/env';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './config/database';
import {
  initLogger,
  initMetrics,
  initRabbitMQ,
  initRedis,
  logger,
  getMetrics,
  getRabbitMQ,
  getRedis,
} from '@ecommerce/shared';

import { productRoutes } from './api/routes/product.routes';
import { errorHandler, notFoundHandler } from './api/middleware/error.middleware';
import { requestLogger, correlationId } from './api/middleware/logging.middleware';

/**
 * Build Fastify app
 */
export async function buildApp() {
  // Initialize logger
  initLogger({
    service: env.SERVICE_NAME,
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  });

  // Initialize metrics
  initMetrics({
    serviceName: env.SERVICE_NAME,
    enableDefaultMetrics: true,
  });

  // Create Fastify instance
  const app = Fastify({
    logger: false, // We use our custom logger
    requestIdLogLabel: 'requestId',
    disableRequestLogging: true,
    trustProxy: true,
  });

  // Register plugins
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
  });

  // Swagger documentation
  if (env.ENABLE_API_DOCS) {
    await app.register(swagger, {
      swagger: {
        info: {
          title: 'Product Service API',
          description: 'Product catalog microservice for e-commerce platform',
          version: '1.0.0',
        },
        host: `localhost:${env.PORT}`,
        schemes: ['http', 'https'],
        consumes: ['application/json'],
        produces: ['application/json'],
        tags: [
          { name: 'products', description: 'Product endpoints' },
          { name: 'categories', description: 'Category endpoints' },
          { name: 'health', description: 'Health check endpoints' },
        ],
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/api-docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });
  }

  // Global hooks
  app.addHook('onRequest', correlationId);
  app.addHook('onRequest', requestLogger);

  // Error handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Health check routes
  app.get('/health', async (request, reply) => {
    const dbHealthy = await checkDatabaseHealth();
    const redisHealthy = await getRedis().ping().then(() => true).catch(() => false);

    const status = dbHealthy && redisHealthy ? 'healthy' : 'degraded';

    return reply.status(status === 'healthy' ? 200 : 503).send({
      status,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: { status: dbHealthy ? 'up' : 'down' },
        redis: { status: redisHealthy ? 'up' : 'down' },
      },
    });
  });

  app.get('/health/ready', async (request, reply) => {
    const dbHealthy = await checkDatabaseHealth();
    return reply.status(dbHealthy ? 200 : 503).send({
      status: dbHealthy ? 'ready' : 'not ready',
    });
  });

  app.get('/health/live', async (request, reply) => {
    return reply.status(200).send({ status: 'alive' });
  });

  // Metrics endpoint
  app.get('/metrics', async (request, reply) => {
    const metrics = getMetrics();
    const metricsText = await metrics.getMetrics();

    return reply
      .header('Content-Type', 'text/plain; version=0.0.4')
      .send(metricsText);
  });

  // API routes
  await app.register(productRoutes, { prefix: '/api/v1/products' });

  return app;
}

/**
 * Start server
 */
async function start() {
  try {
    logger.info('🚀 Starting Product Service...');
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Service: ${env.SERVICE_NAME}`);

    // Connect to database
    await connectDatabase();

    // Initialize Redis
    const redis = initRedis({
      url: env.REDIS_URL,
      keyPrefix: 'product:',
    });

    logger.info('✅ Redis initialized');

    // Initialize RabbitMQ
    const rabbitmq = initRabbitMQ({
      url: env.RABBITMQ_URL,
      exchanges: [
        {
          name: 'ecommerce.events',
          type: 'topic',
          options: { durable: true },
        },
      ],
      queues: [
        {
          name: 'product-service.events',
          options: { durable: true },
          bindings: [
            {
              exchange: 'ecommerce.events',
              routingKey: 'order.*',
            },
          ],
        },
      ],
    });

    await rabbitmq.connect();
    logger.info('✅ RabbitMQ connected');

    // Build app
    const app = await buildApp();

    // Start server
    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`✅ Server listening on port ${env.PORT}`);
    logger.info(`📚 API Documentation: http://localhost:${env.PORT}/api-docs`);

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`${signal} received, shutting down gracefully...`);

        try {
          await app.close();
          await disconnectDatabase();
          await rabbitmq.close();
          await redis.disconnect();

          logger.info('✅ Shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', error as Error);
          process.exit(1);
        }
      });
    });

  } catch (error) {
    logger.error('💥 Failed to start server', error as Error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

export default buildApp;
