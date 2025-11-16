/**
 * Logging middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@ecommerce/shared';
import crypto from 'crypto';

export async function loggingMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const startTime = Date.now();

  // Generate correlation ID
  const correlationId = crypto.randomUUID();
  request.headers['x-correlation-id'] = correlationId;

  // Log incoming request
  logger.info('Incoming request', {
    correlationId,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  });

  // Log response when sent
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
