import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import { PrismaClient } from '@prisma/client';
import { initRabbitMQ, getRabbitMQ } from '@ecommerce/shared';

const prisma = new PrismaClient();

async function start() {
  const app = Fastify();
  await app.register(cors);
  await app.register(swagger, { openapi: { info: { title: 'Analytics Service', version: '1.0.0' } } });

  // Track event
  app.post('/api/v1/events', async (request, reply) => {
    const { type, userId, data } = request.body as any;
    const event = await prisma.event.create({
      data: {
        type,
        userId,
        data,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      },
    });
    return reply.status(201).send({ success: true, data: { event } });
  });

  // Get events
  app.get('/api/v1/events', async (request, reply) => {
    const { type, userId, page = 1, limit = 100 } = request.query as any;
    const events = await prisma.event.findMany({
      where: { ...(type && { type }), ...(userId && { userId }) },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ success: true, data: { events } });
  });

  // Record metric
  app.post('/api/v1/metrics', async (request, reply) => {
    const { name, value, tags } = request.body as any;
    const metric = await prisma.metric.create({ data: { name, value, tags } });
    return reply.status(201).send({ success: true, data: { metric } });
  });

  // Get metrics
  app.get('/api/v1/metrics/:name', async (request, reply) => {
    const { name } = request.params as any;
    const { from, to } = request.query as any;
    const metrics = await prisma.metric.findMany({
      where: {
        name,
        ...(from && { timestamp: { gte: new Date(from) } }),
        ...(to && { timestamp: { lte: new Date(to) } }),
      },
      orderBy: { timestamp: 'asc' },
    });

    const avg = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length || 0;
    return reply.send({ success: true, data: { metrics, stats: { count: metrics.length, avg } } });
  });

  // Sales report
  app.get('/api/v1/reports/sales', async (request, reply) => {
    const { from, to } = request.query as any;
    const events = await prisma.event.findMany({
      where: {
        type: 'order.completed',
        ...(from && { createdAt: { gte: new Date(from) } }),
        ...(to && { createdAt: { lte: new Date(to) } }),
      },
    });

    const totalSales = events.reduce((sum, e: any) => sum + (e.data?.total || 0), 0);
    const avgOrderValue = totalSales / events.length || 0;

    return reply.send({
      success: true,
      data: {
        totalOrders: events.length,
        totalSales,
        avgOrderValue,
      },
    });
  });

  app.get('/health', async () => ({ status: 'healthy' }));

  // Subscribe to all events
  const rabbitmq = initRabbitMQ({ url: process.env.RABBITMQ_URL!, serviceName: 'analytics-service' });
  await rabbitmq.connect();
  await rabbitmq.setupExchange('ecommerce.events', 'topic');

  await rabbitmq.subscribe('ecommerce.events', '#', async (event) => {
    await prisma.event.create({
      data: {
        type: event.type,
        userId: event.data?.userId,
        data: event.data,
      },
    });
  });

  await app.listen({ port: 3010, host: '0.0.0.0' });
  console.log('✅ Analytics Service running on port 3010');
}

start().catch(console.error);
