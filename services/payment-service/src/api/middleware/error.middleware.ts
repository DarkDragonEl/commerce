/**
 * Error handling middleware
 */

import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError, formatErrorResponse, isOperationalError, logger } from '@ecommerce/shared';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export async function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) {
  logger.error('Request error', error, {
    method: request.method,
    url: request.url,
  });

  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      },
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A record with this value already exists',
        },
      });
    }
    if (error.code === 'P2025') {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      });
    }
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(formatErrorResponse(error));
  }

  if ((error as FastifyError).validation) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: (error as FastifyError).validation,
      },
    });
  }

  const isOperational = isOperationalError(error);
  if (!isOperational) {
    logger.error('💥 CRITICAL ERROR - Non-operational error detected', error);
  }

  return reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  });
}

export async function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  return reply.status(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method}:${request.url} not found`,
    },
  });
}
