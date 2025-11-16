/**
 * Auth Service Main Server
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
import { authRoutes } from './api/routes/auth.routes';
import { errorHandler, notFoundHandler } from './api/middleware/error.middleware';
import { loggingMiddleware } from './api/middleware/logging.middleware';

/**
 * Build Fastify application
 */
async function buildApp() {
  const app = Fastify({
    logger: false, // We use our custom logger
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Security plugins
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

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Auth Service API',
        description: 'Authentication and Authorization Service with Keycloak integration',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'Authentication', description: 'Authentication endpoints' },
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

  // Global hooks
  app.addHook('onRequest', loggingMiddleware);

  // Health check routes
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

  // Register routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });

  // Error handlers
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  return app;
}

/**
 * Start the server
 */
async function start() {
  try {
    // Initialize logger
    initLogger({
      serviceName: env.SERVICE_NAME,
      logLevel: env.LOG_LEVEL,
      logFormat: env.LOG_FORMAT,
    });

    logger.info('🚀 Starting Auth Service...');

    // Connect to database
    await connectDatabase();

    // Initialize Redis
    const redis = initRedis({
      url: env.REDIS_URL,
      db: env.REDIS_DB,
    });

    // Initialize RabbitMQ
    const rabbitmq = initRabbitMQ({
      url: env.RABBITMQ_URL,
      serviceName: env.SERVICE_NAME,
    });

    await rabbitmq.connect();

    // Setup event exchange
    await rabbitmq.setupExchange('ecommerce.events', 'topic');

    logger.info('✅ All connections initialized');

    // Build and start the app
    const app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`✅ Auth Service listening on port ${env.PORT}`);
    logger.info(`📚 API Documentation available at http://localhost:${env.PORT}/api-docs`);

    // Graceful shutdown
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
    logger.error('💥 Failed to start Auth Service', error);
    process.exit(1);
  }
}

// Start the server
start();
