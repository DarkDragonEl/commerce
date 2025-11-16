/**
 * Request logging middleware
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { logger, getMetrics } from '@ecommerce/shared';
import env from '../../config/env';

export async function requestLogger(request: FastifyRequest, reply: FastifyReply) {
  const startTime = Date.now();
  const requestId = request.id;

  // Log incoming request
  logger.http('Incoming request', {
    requestId,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  });

  // Add response hook to log completion
  reply.addHook('onSend', async (request, reply) => {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const statusCode = reply.statusCode;

    // Log response
    logger.http('Request completed', {
      requestId,
      method: request.method,
      url: request.url,
      statusCode,
      duration: `${duration}s`,
    });

    // Record metrics
    try {
      const metrics = getMetrics();
      const route = request.routerPath || request.url;

      metrics.recordHttpRequest(
        request.method,
        route,
        statusCode,
        duration
      );
    } catch (error) {
      // Don't fail request if metrics recording fails
      logger.warn('Failed to record metrics', { error });
    }
  });
}

/**
 * Add correlation ID to requests
 */
export async function correlationId(request: FastifyRequest, reply: FastifyReply) {
  const correlationId = request.headers['x-correlation-id'] as string || request.id;

  // Add correlation ID to response headers
  reply.header('x-correlation-id', correlationId);

  // Add to request context for use in logs
  (request as any).correlationId = correlationId;
}
