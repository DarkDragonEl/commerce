import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { initLogger, logger, initRedis, initRabbitMQ, getRabbitMQ } from '@ecommerce/shared';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase, checkDatabaseHealth } from './config/database';
import { EmailService } from './services/email.service';
import { smtpClient } from './clients/smtp.client';

async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors);
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Email Service API',
        version: '1.0.0',
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/api-docs' });

  const rabbitmq = getRabbitMQ();
  const emailService = new EmailService(rabbitmq);

  app.post('/api/v1/emails', async (request, reply) => {
    const { to, subject, template, variables } = request.body as any;
    const email = await emailService.queueEmail({ to, subject, template, variables });
    return reply.status(201).send({ success: true, data: { email } });
  });

  app.get('/api/v1/emails/:id', async (request, reply) => {
    const { id } = request.params as any;
    const email = await emailService.getEmail(id);
    return reply.send({ success: true, data: { email } });
  });

  app.get('/api/v1/emails', async (request, reply) => {
    const { page = 1, limit = 20 } = request.query as any;
    const skip = (page - 1) * limit;
    const emails = await emailService.listEmails({ skip, take: limit });
    return reply.send({ success: true, data: { emails } });
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
    await rabbitmq.subscribe('ecommerce.events', 'email.#', async (event) => {
      await emailService.handleEvent(event);
    });
  }

  return app;
}

async function start() {
  try {
    initLogger({ serviceName: env.SERVICE_NAME, logLevel: env.LOG_LEVEL, logFormat: env.LOG_FORMAT });
    logger.info('🚀 Starting Email Service...');

    await connectDatabase();

    initRedis({ url: env.REDIS_URL, db: env.REDIS_DB });

    const rabbitmq = initRabbitMQ({ url: env.RABBITMQ_URL, serviceName: env.SERVICE_NAME });
    await rabbitmq.connect();
    await rabbitmq.setupExchange('ecommerce.events', 'topic');

    // Verify SMTP
    const smtpOk = await smtpClient.verifyConnection();
    if (!smtpOk) logger.warn('⚠️  SMTP connection failed');
    else logger.info('✅ SMTP connected');

    const app = await buildApp();
    await app.listen({ port: env.PORT, host: '0.0.0.0' });

    logger.info(`✅ Email Service listening on port ${env.PORT}`);

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
