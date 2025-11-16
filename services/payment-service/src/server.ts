/**
 * Payment Service Main Server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { initLogger, logger, initRedis, initRabbitMQ } from '@ecommerce/shared';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './config/database';
import { paymentRoutes } from './api/routes/payment.routes';
import { errorHandler, notFoundHandler } from './api/middleware/error.middleware';
import { loggingMiddleware } from './api/middleware/logging.middleware';

async function buildApp() {
  const app = Fastify({
    logger: false,
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Payment Service API',
        description: 'Payment Processing Service with Stripe integration',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'Payments', description: 'Payment processing endpoints' },
        { name: 'Webhooks', description: 'Webhook endpoints' },
        { name: 'Health', description: 'Health check endpoints' },
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

  app.addHook('onRequest', loggingMiddleware);

  app.get('/health', async (request, reply) => {
    return reply.send({
      status: 'healthy',
      service: env.SERVICE_NAME,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/live', async (request, reply) => {
    return reply.send({ status: 'ok' });
  });

  app.get('/health/ready', async (request, reply) => {
    const dbHealth = await checkDatabaseHealth();

    if (dbHealth.status === 'down') {
      return reply.status(503).send({
        status: 'not ready',
        checks: {
          database: dbHealth,
        },
      });
    }

    return reply.send({
      status: 'ready',
      checks: {
        database: dbHealth,
      },
    });
  });

  await app.register(paymentRoutes, { prefix: '/api/v1/payments' });

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  return app;
}

async function start() {
  try {
    initLogger({
      serviceName: env.SERVICE_NAME,
      logLevel: env.LOG_LEVEL,
      logFormat: env.LOG_FORMAT,
    });

    logger.info('🚀 Starting Payment Service...');

    await connectDatabase();

    const redis = initRedis({
      url: env.REDIS_URL,
      db: env.REDIS_DB,
    });

    const rabbitmq = initRabbitMQ({
      url: env.RABBITMQ_URL,
      serviceName: env.SERVICE_NAME,
    });

    await rabbitmq.connect();
    await rabbitmq.setupExchange('ecommerce.events', 'topic');

    logger.info('✅ All connections initialized');

    const app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`✅ Payment Service listening on port ${env.PORT}`);
    logger.info(`📚 API Documentation available at http://localhost:${env.PORT}/api-docs`);

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      try {
        await app.close();
        await disconnectDatabase();
        await redis.disconnect();
        await rabbitmq.disconnect();

        logger.info('✅ Shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('💥 Failed to start Payment Service', error);
    process.exit(1);
  }
}

start();
