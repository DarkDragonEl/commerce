/**
 * Authentication Service
 */

import crypto from 'crypto';
import { User } from '@prisma/client';
import {
  logger,
  UnauthorizedError,
  BadRequestError,
  NotFoundError,
  RabbitMQClient,
  UserEventType
} from '@ecommerce/shared';
import { keycloakClient } from '../clients/keycloak.client';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { LoginHistoryRepository } from '../repositories/login-history.repository';
import { env } from '../config/env';

export interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionToken: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private sessionRepository: SessionRepository,
    private refreshTokenRepository: RefreshTokenRepository,
    private loginHistoryRepository: LoginHistoryRepository,
    private rabbitmq?: RabbitMQClient
  ) {}

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<User> {
    // Check if user already exists
    const existingEmail = await this.userRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new BadRequestError('Email already registered');
    }

    const existingUsername = await this.userRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new BadRequestError('Username already taken');
    }

    try {
      // Create user in Keycloak
      const keycloakId = await keycloakClient.createUser({
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        enabled: true,
      });

      // Create user in local database
      const user = await this.userRepository.create({
        keycloakId,
        email: data.email,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        emailVerified: false,
        enabled: true,
      });

      // Send verification email
      try {
        await keycloakClient.sendVerificationEmail(keycloakId);
      } catch (error) {
        logger.warn('Failed to send verification email', { userId: user.id, error });
      }

      logger.info('User registered successfully', { userId: user.id, username: data.username });

      // Publish user registered event
      if (this.rabbitmq) {
        await this.rabbitmq.publish('ecommerce.events', 'user.registered', {
          id: crypto.randomUUID(),
          type: UserEventType.REGISTERED,
          timestamp: new Date().toISOString(),
          source: 'auth-service',
          data: {
            userId: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
          },
        });
      }

      return user;
    } catch (error: any) {
      logger.error('Registration failed', error);
      throw new BadRequestError(error.message || 'Registration failed');
    }
  }

  /**
   * Login with username/email and password
   */
  async login(
    usernameOrEmail: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    try {
      // Authenticate with Keycloak
      const tokenResponse = await keycloakClient.login(usernameOrEmail, password);

      // Get user info from Keycloak
      const userInfo = await keycloakClient.getUserInfo(tokenResponse.access_token);

      // Sync user to local database
      const user = await this.userRepository.syncFromKeycloak(userInfo.sub, {
        email: userInfo.email,
        username: userInfo.preferred_username,
        firstName: userInfo.given_name,
        lastName: userInfo.family_name,
        emailVerified: userInfo.email_verified,
        enabled: true,
      });

      // Create session
      const sessionToken = this.generateToken();
      const expiresAt = new Date(Date.now() + env.SESSION_MAX_AGE);

      const session = await this.sessionRepository.create({
        user: { connect: { id: user.id } },
        sessionToken,
        ipAddress,
        userAgent,
        expiresAt,
        isActive: true,
      });

      // Store refresh token
      await this.refreshTokenRepository.create({
        user: { connect: { id: user.id } },
        token: this.generateToken(),
        keycloakToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.refresh_expires_in * 1000),
        ipAddress,
        userAgent,
      });

      // Log successful login
      await this.loginHistoryRepository.create({
        user: { connect: { id: user.id } },
        loginMethod: 'password',
        success: true,
        ipAddress,
        userAgent,
      });

      logger.info('User logged in successfully', { userId: user.id, username: user.username });

      // Publish user login event
      if (this.rabbitmq) {
        await this.rabbitmq.publish('ecommerce.events', 'user.login', {
          id: crypto.randomUUID(),
          type: UserEventType.LOGIN,
          timestamp: new Date().toISOString(),
          source: 'auth-service',
          data: {
            userId: user.id,
            username: user.username,
            email: user.email,
            ipAddress,
            userAgent,
          },
        });
      }

      return {
        user,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
        sessionToken: session.sessionToken,
      };
    } catch (error: any) {
      // Log failed login attempt
      const user = await this.userRepository.findByEmail(usernameOrEmail) ||
                    await this.userRepository.findByUsername(usernameOrEmail);

      if (user) {
        await this.loginHistoryRepository.create({
          user: { connect: { id: user.id } },
          loginMethod: 'password',
          success: false,
          failureReason: error.message,
          ipAddress,
          userAgent,
        });
      }

      logger.warn('Login failed', { usernameOrEmail, error: error.message });
      throw new UnauthorizedError('Invalid credentials');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Find refresh token in database
    const tokenRecord = await this.refreshTokenRepository.findByToken(refreshToken);

    if (!tokenRecord) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (tokenRecord.isRevoked) {
      throw new UnauthorizedError('Token has been revoked');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedError('Token has expired');
    }

    try {
      // Refresh token with Keycloak
      const tokenResponse = await keycloakClient.refreshToken(
        tokenRecord.keycloakToken || refreshToken
      );

      // Update token record
      const newToken = this.generateToken();
      await this.refreshTokenRepository.revoke(tokenRecord.id, newToken);

      // Create new refresh token
      await this.refreshTokenRepository.create({
        user: { connect: { id: tokenRecord.userId } },
        token: newToken,
        keycloakToken: tokenResponse.refresh_token,
        expiresAt: new Date(Date.now() + tokenResponse.refresh_expires_in * 1000),
        ipAddress: tokenRecord.ipAddress,
        userAgent: tokenRecord.userAgent,
      });

      logger.info('Token refreshed successfully', { userId: tokenRecord.userId });

      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
      };
    } catch (error) {
      logger.error('Token refresh failed', error);
      throw new UnauthorizedError('Failed to refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(sessionToken: string, refreshToken: string): Promise<void> {
    try {
      // Find session
      const session = await this.sessionRepository.findByToken(sessionToken);

      if (session) {
        // Invalidate session
        await this.sessionRepository.invalidate(session.id);

        // Revoke refresh tokens
        const refreshTokenRecord = await this.refreshTokenRepository.findByToken(refreshToken);
        if (refreshTokenRecord) {
          await this.refreshTokenRepository.revoke(refreshTokenRecord.id);

          // Logout from Keycloak
          if (refreshTokenRecord.keycloakToken) {
            try {
              await keycloakClient.logout(refreshTokenRecord.keycloakToken);
            } catch (error) {
              logger.warn('Keycloak logout failed', error);
            }
          }
        }

        logger.info('User logged out successfully', { userId: session.userId });

        // Publish user logout event
        if (this.rabbitmq) {
          await this.rabbitmq.publish('ecommerce.events', 'user.logout', {
            id: crypto.randomUUID(),
            type: UserEventType.LOGOUT,
            timestamp: new Date().toISOString(),
            source: 'auth-service',
            data: {
              userId: session.user.id,
              username: session.user.username,
            },
          });
        }
      }
    } catch (error) {
      logger.error('Logout failed', error);
      throw error;
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionToken: string): Promise<User> {
    const session = await this.sessionRepository.findByToken(sessionToken);

    if (!session) {
      throw new UnauthorizedError('Invalid session');
    }

    if (!session.isActive) {
      throw new UnauthorizedError('Session is not active');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedError('Session has expired');
    }

    // Update last activity
    await this.sessionRepository.updateActivity(session.id);

    return session.user;
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string): Promise<any> {
    try {
      const introspection = await keycloakClient.introspectToken(accessToken);

      if (!introspection.active) {
        throw new UnauthorizedError('Token is not active');
      }

      return introspection;
    } catch (error) {
      logger.error('Token validation failed', error);
      throw new UnauthorizedError('Invalid token');
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(accessToken: string): Promise<any> {
    try {
      return await keycloakClient.getUserInfo(accessToken);
    } catch (error) {
      logger.error('Failed to get user info', error);
      throw new UnauthorizedError('Failed to get user info');
    }
  }

  /**
   * Change password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    try {
      // Verify old password by attempting login
      await keycloakClient.login(user.username, oldPassword);

      // Reset password in Keycloak
      await keycloakClient.resetPassword(user.keycloakId, newPassword, false);

      logger.info('Password changed successfully', { userId });

      // Publish password changed event
      if (this.rabbitmq) {
        await this.rabbitmq.publish('ecommerce.events', 'user.password_changed', {
          id: crypto.randomUUID(),
          type: UserEventType.PASSWORD_CHANGED,
          timestamp: new Date().toISOString(),
          source: 'auth-service',
          data: {
            userId: user.id,
            email: user.email,
          },
        });
      }
    } catch (error) {
      logger.error('Password change failed', { userId, error });
      throw new BadRequestError('Failed to change password');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      logger.warn('Password reset requested for non-existent email', { email });
      return;
    }

    // In production, you would send a password reset email
    // For now, we'll just log it
    logger.info('Password reset requested', { userId: user.id, email });

    // TODO: Implement password reset email with token
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<any[]> {
    return await this.sessionRepository.findActiveByUserId(userId);
  }

  /**
   * Revoke all user sessions
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.sessionRepository.invalidateAllUserSessions(userId);
    await this.refreshTokenRepository.revokeAllUserTokens(userId);

    logger.info('All sessions revoked', { userId });
  }

  /**
   * Generate random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
