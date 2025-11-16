/**
 * Auth Routes
 */

import { FastifyInstance } from 'fastify';
import { getRabbitMQ } from '@ecommerce/shared';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../../services/auth.service';
import { UserRepository } from '../../repositories/user.repository';
import { SessionRepository } from '../../repositories/session.repository';
import { RefreshTokenRepository } from '../../repositories/refresh-token.repository';
import { LoginHistoryRepository } from '../../repositories/login-history.repository';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  LogoutSchema,
  ChangePasswordSchema,
  PasswordResetRequestSchema,
  ValidateSessionSchema,
  ValidateTokenSchema,
} from '../validators/auth.validator';

export async function authRoutes(app: FastifyInstance) {
  // Initialize repositories
  const userRepository = new UserRepository();
  const sessionRepository = new SessionRepository();
  const refreshTokenRepository = new RefreshTokenRepository();
  const loginHistoryRepository = new LoginHistoryRepository();

  // Initialize service
  const rabbitmq = getRabbitMQ();
  const authService = new AuthService(
    userRepository,
    sessionRepository,
    refreshTokenRepository,
    loginHistoryRepository,
    rabbitmq
  );

  // Initialize controller
  const controller = new AuthController(authService);

  /**
   * Register new user
   */
  app.post('/register', {
    schema: {
      description: 'Register a new user',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 50 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    preHandler: async (request, reply) => {
      const result = RegisterSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, controller.register.bind(controller));

  /**
   * Login
   */
  app.post('/login', {
    schema: {
      description: 'Login with username/email and password',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['usernameOrEmail', 'password'],
        properties: {
          usernameOrEmail: { type: 'string' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                tokens: { type: 'object' },
              },
            },
          },
        },
      },
    },
    preHandler: async (request, reply) => {
      const result = LoginSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, controller.login.bind(controller));

  /**
   * Refresh token
   */
  app.post('/refresh', {
    schema: {
      description: 'Refresh access token',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
    preHandler: async (request, reply) => {
      const result = RefreshTokenSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, controller.refreshToken.bind(controller));

  /**
   * Logout
   */
  app.post('/logout', {
    schema: {
      description: 'Logout user',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['sessionToken', 'refreshToken'],
        properties: {
          sessionToken: { type: 'string' },
          refreshToken: { type: 'string' },
        },
      },
    },
    preHandler: async (request, reply) => {
      const result = LogoutSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, controller.logout.bind(controller));

  /**
   * Validate session
   */
  app.post('/validate-session', {
    schema: {
      description: 'Validate session token',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['sessionToken'],
        properties: {
          sessionToken: { type: 'string' },
        },
      },
    },
    preHandler: async (request, reply) => {
      const result = ValidateSessionSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, controller.validateSession.bind(controller));

  /**
   * Validate token
   */
  app.post('/validate-token', {
    schema: {
      description: 'Validate access token',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['accessToken'],
        properties: {
          accessToken: { type: 'string' },
        },
      },
    },
    preHandler: async (request, reply) => {
      const result = ValidateTokenSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, controller.validateToken.bind(controller));

  /**
   * Get current user
   */
  app.get('/me', {
    schema: {
      description: 'Get current user information',
      tags: ['Authentication'],
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
    },
  }, controller.getMe.bind(controller));

  /**
   * Change password
   */
  app.post('/users/:userId/change-password', {
    schema: {
      description: 'Change user password',
      tags: ['Authentication'],
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['oldPassword', 'newPassword'],
        properties: {
          oldPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
    },
    preHandler: async (request, reply) => {
      const result = ChangePasswordSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, controller.changePassword.bind(controller));

  /**
   * Request password reset
   */
  app.post('/password-reset/request', {
    schema: {
      description: 'Request password reset',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
    preHandler: async (request, reply) => {
      const result = PasswordResetRequestSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, controller.requestPasswordReset.bind(controller));

  /**
   * Get user sessions
   */
  app.get('/users/:userId/sessions', {
    schema: {
      description: 'Get all active sessions for a user',
      tags: ['Authentication'],
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, controller.getSessions.bind(controller));

  /**
   * Revoke all sessions
   */
  app.delete('/users/:userId/sessions', {
    schema: {
      description: 'Revoke all sessions for a user',
      tags: ['Authentication'],
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, controller.revokeAllSessions.bind(controller));
}
