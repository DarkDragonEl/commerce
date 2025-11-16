/**
 * Auth Controller
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../../services/auth.service';
import {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  LogoutInput,
  ChangePasswordInput,
  PasswordResetRequestInput,
  ValidateSessionInput,
  ValidateTokenInput,
} from '../validators/auth.validator';

export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Register new user
   */
  async register(
    request: FastifyRequest<{ Body: RegisterInput }>,
    reply: FastifyReply
  ) {
    const user = await this.authService.register(request.body);

    return reply.status(201).send({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
        },
        message: 'Registration successful. Please check your email to verify your account.',
      },
    });
  }

  /**
   * Login user
   */
  async login(
    request: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply
  ) {
    const { usernameOrEmail, password } = request.body;
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await this.authService.login(
      usernameOrEmail,
      password,
      ipAddress,
      userAgent
    );

    return reply.send({
      success: true,
      data: {
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          emailVerified: result.user.emailVerified,
        },
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          sessionToken: result.sessionToken,
        },
      },
    });
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    request: FastifyRequest<{ Body: RefreshTokenInput }>,
    reply: FastifyReply
  ) {
    const { refreshToken } = request.body;

    const result = await this.authService.refreshAccessToken(refreshToken);

    return reply.send({
      success: true,
      data: {
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
      },
    });
  }

  /**
   * Logout user
   */
  async logout(
    request: FastifyRequest<{ Body: LogoutInput }>,
    reply: FastifyReply
  ) {
    const { sessionToken, refreshToken } = request.body;

    await this.authService.logout(sessionToken, refreshToken);

    return reply.send({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  }

  /**
   * Validate session
   */
  async validateSession(
    request: FastifyRequest<{ Body: ValidateSessionInput }>,
    reply: FastifyReply
  ) {
    const { sessionToken } = request.body;

    const user = await this.authService.validateSession(sessionToken);

    return reply.send({
      success: true,
      data: {
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          emailVerified: user.emailVerified,
        },
      },
    });
  }

  /**
   * Validate access token
   */
  async validateToken(
    request: FastifyRequest<{ Body: ValidateTokenInput }>,
    reply: FastifyReply
  ) {
    const { accessToken } = request.body;

    const introspection = await this.authService.validateToken(accessToken);

    return reply.send({
      success: true,
      data: {
        valid: introspection.active,
        introspection,
      },
    });
  }

  /**
   * Get current user info
   */
  async getMe(
    request: FastifyRequest<{ Headers: { authorization: string } }>,
    reply: FastifyReply
  ) {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
        },
      });
    }

    const userInfo = await this.authService.getUserInfo(token);

    return reply.send({
      success: true,
      data: userInfo,
    });
  }

  /**
   * Change password
   */
  async changePassword(
    request: FastifyRequest<{
      Body: ChangePasswordInput;
      Params: { userId: string };
    }>,
    reply: FastifyReply
  ) {
    const { userId } = request.params;
    const { oldPassword, newPassword } = request.body;

    await this.authService.changePassword(userId, oldPassword, newPassword);

    return reply.send({
      success: true,
      data: {
        message: 'Password changed successfully',
      },
    });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(
    request: FastifyRequest<{ Body: PasswordResetRequestInput }>,
    reply: FastifyReply
  ) {
    const { email } = request.body;

    await this.authService.requestPasswordReset(email);

    return reply.send({
      success: true,
      data: {
        message: 'If the email exists, a password reset link has been sent.',
      },
    });
  }

  /**
   * Get user sessions
   */
  async getSessions(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    const { userId } = request.params;

    const sessions = await this.authService.getUserSessions(userId);

    return reply.send({
      success: true,
      data: { sessions },
    });
  }

  /**
   * Revoke all sessions
   */
  async revokeAllSessions(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    const { userId } = request.params;

    await this.authService.revokeAllSessions(userId);

    return reply.send({
      success: true,
      data: {
        message: 'All sessions revoked successfully',
      },
    });
  }
}
