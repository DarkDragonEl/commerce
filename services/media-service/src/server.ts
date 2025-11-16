import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { initLogger, logger, initRedis } from '@ecommerce/shared';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { minioClient } from './clients/minio.client';
import { MediaService } from './services/media.service';

async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors);
  await app.register(multipart, { limits: { fileSize: env.MAX_FILE_SIZE } });
  await app.register(swagger, { openapi: { info: { title: 'Media Service API', version: '1.0.0' } } });
  await app.register(swaggerUi, { routePrefix: '/api-docs' });

  const mediaService = new MediaService();

  app.post('/api/v1/media/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) throw new Error('No file uploaded');

    const buffer = await data.toBuffer();
    const media = await mediaService.upload({
      data: buffer,
      filename: data.filename,
      mimetype: data.mimetype,
      size: buffer.length,
    });

    return reply.status(201).send({ success: true, data: { media } });
  });

  app.get('/api/v1/media/:id', async (request, reply) => {
    const { id } = request.params as any;
    const media = await mediaService.get(id);
    return reply.send({ success: true, data: { media } });
  });

  app.get('/api/v1/media/:id/download', async (request, reply) => {
    const { id } = request.params as any;
    const { buffer, media } = await mediaService.download(id);

    reply.header('Content-Type', media.mimeType);
    reply.header('Content-Disposition', `attachment; filename="${media.filename}"`);
    return reply.send(buffer);
  });

  app.delete('/api/v1/media/:id', async (request, reply) => {
    const { id } = request.params as any;
    await mediaService.delete(id);
    return reply.send({ success: true });
  });

  app.get('/api/v1/media', async (request, reply) => {
    const { page = 1, limit = 20, type } = request.query as any;
    const skip = (page - 1) * limit;
    const media = await mediaService.list({ skip, take: limit, type });
    return reply.send({ success: true, data: { media } });
  });

  app.get('/health', async () => ({ status: 'healthy', service: env.SERVICE_NAME }));

  return app;
}

async function start() {
  try {
    initLogger({ serviceName: env.SERVICE_NAME, logLevel: env.LOG_LEVEL, logFormat: env.LOG_FORMAT });
    logger.info('🚀 Starting Media Service...');

    await connectDatabase();
    await minioClient.initialize();
    initRedis({ url: env.REDIS_URL, db: env.REDIS_DB });

    const app = await buildApp();
    await app.listen({ port: env.PORT, host: '0.0.0.0' });

    logger.info(`✅ Media Service listening on port ${env.PORT}`);

    process.on('SIGTERM', async () => {
      await app.close();
      await disconnectDatabase();
      process.exit(0);
    });
  } catch (error) {
    logger.error('💥 Failed to start', error);
    process.exit(1);
  }
}

start();
