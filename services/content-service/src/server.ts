import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function start() {
  const app = Fastify();
  await app.register(cors);
  await app.register(swagger, { openapi: { info: { title: 'Content Service', version: '1.0.0' } } });

  app.post('/api/v1/posts', async (request, reply) => {
    const data = request.body as any;
    const post = await prisma.post.create({ data: { ...data, slug: data.title.toLowerCase().replace(/\s+/g, '-') } });
    return reply.status(201).send({ success: true, data: { post } });
  });

  app.get('/api/v1/posts', async (request, reply) => {
    const { page = 1, limit = 20 } = request.query as any;
    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { publishedAt: 'desc' },
    });
    return reply.send({ success: true, data: { posts } });
  });

  app.get('/api/v1/posts/:slug', async (request, reply) => {
    const { slug } = request.params as any;
    const post = await prisma.post.findUnique({ where: { slug } });
    return reply.send({ success: true, data: { post } });
  });

  app.put('/api/v1/posts/:id', async (request, reply) => {
    const { id } = request.params as any;
    const post = await prisma.post.update({ where: { id }, data: request.body as any });
    return reply.send({ success: true, data: { post } });
  });

  app.delete('/api/v1/posts/:id', async (request, reply) => {
    const { id } = request.params as any;
    await prisma.post.delete({ where: { id } });
    return reply.send({ success: true });
  });

  app.post('/api/v1/pages', async (request, reply) => {
    const data = request.body as any;
    const page = await prisma.page.create({ data: { ...data, slug: data.title.toLowerCase().replace(/\s+/g, '-') } });
    return reply.status(201).send({ success: true, data: { page } });
  });

  app.get('/api/v1/pages/:slug', async (request, reply) => {
    const { slug } = request.params as any;
    const page = await prisma.page.findUnique({ where: { slug } });
    return reply.send({ success: true, data: { page } });
  });

  app.get('/health', async () => ({ status: 'healthy' }));

  await app.listen({ port: 3009, host: '0.0.0.0' });
  console.log('✅ Content Service running on port 3009');
}

start().catch(console.error);
