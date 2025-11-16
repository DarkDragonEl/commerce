/**
 * Logging middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@ecommerce/shared';
import crypto from 'crypto';

export async function loggingMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const startTime = Date.now();
  const correlationId = crypto.randomUUID();
  request.headers['x-correlation-id'] = correlationId;

  logger.info('Incoming request', {
    correlationId,
    method: request.method,
    url: request.url,
    ip: request.ip,
  });

  reply.addHook('onSend', async (request, reply, payload) => {
    const duration = Date.now() - startTime;
    logger.info('Outgoing response', {
      correlationId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
    });
    return payload;
  });
}
