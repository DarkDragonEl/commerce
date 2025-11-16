/**
 * Error handling middleware
 */

import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError, formatErrorResponse, isOperationalError, logger } from '@ecommerce/shared';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export async function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) {
  // Log the error
  logger.error('Request error', error, {
    method: request.method,
    url: request.url,
    params: request.params,
    query: request.query,
  });

  // Handle Zod validation errors
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

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A record with this value already exists',
          details: {
            field: error.meta?.target,
          },
        },
      });
    }

    // Foreign key constraint violation
    if (error.code === 'P2003') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_REFERENCE',
          message: 'Referenced record does not exist',
          details: {
            field: error.meta?.field_name,
          },
        },
      });
    }

    // Record not found
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

  // Handle application errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(formatErrorResponse(error));
  }

  // Handle Fastify validation errors
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

  // Determine if this is an operational error
  const isOperational = isOperationalError(error);

  if (!isOperational) {
    // For programming errors, we might want to exit the process
    // in production to prevent further issues
    logger.error('💥 CRITICAL ERROR - Non-operational error detected', error);

    // In production, you might want to:
    // process.exit(1);
  }

  // Default internal server error
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

/**
 * Not found handler
 */
export async function notFoundHandler(request: FastifyRequest, reply: FastifyReply) {
  return reply.status(404).send({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method}:${request.url} not found`,
    },
  });
}
