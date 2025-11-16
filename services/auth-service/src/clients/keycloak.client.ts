/**
 * Keycloak Admin Client for user management
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '@ecommerce/shared';
import { env } from '../config/env';

export interface KeycloakUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified: boolean;
  createdTimestamp?: number;
  attributes?: Record<string, string[]>;
}

export interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
  scope: string;
}

export interface KeycloakUserInfo {
  sub: string;
  email_verified: boolean;
  name?: string;
  preferred_username: string;
  given_name?: string;
  family_name?: string;
  email: string;
}

export class KeycloakClient {
  private client: AxiosInstance;
  private adminToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.client = axios.create({
      baseURL: env.KEYCLOAK_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get admin access token
   */
  private async getAdminToken(): Promise<string> {
    // Return cached token if still valid
    if (this.adminToken && Date.now() < this.tokenExpiry) {
      return this.adminToken;
    }

    try {
      const response = await axios.post(
        `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: env.KEYCLOAK_CLIENT_ID,
          client_secret: env.KEYCLOAK_CLIENT_SECRET,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.adminToken = response.data.access_token;
      // Set expiry with 30 second buffer
      this.tokenExpiry = Date.now() + (response.data.expires_in - 30) * 1000;

      return this.adminToken;
    } catch (error) {
      logger.error('Failed to get Keycloak admin token', error);
      throw new Error('Failed to authenticate with Keycloak');
    }
  }

  /**
   * Login user with username and password
   */
  async login(username: string, password: string): Promise<KeycloakTokenResponse> {
    try {
      const response = await axios.post(
        `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: env.KEYCLOAK_CLIENT_ID,
          client_secret: env.KEYCLOAK_CLIENT_SECRET,
          username,
          password,
          scope: 'openid profile email',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Keycloak login failed', { username, error: error.response?.data });
      throw new Error(error.response?.data?.error_description || 'Login failed');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    try {
      const response = await axios.post(
        `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: env.KEYCLOAK_CLIENT_ID,
          client_secret: env.KEYCLOAK_CLIENT_SECRET,
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Token refresh failed', error);
      throw new Error('Failed to refresh token');
    }
  }

  /**
   * Logout user (revoke tokens)
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await axios.post(
        `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}/protocol/openid-connect/logout`,
        new URLSearchParams({
          client_id: env.KEYCLOAK_CLIENT_ID,
          client_secret: env.KEYCLOAK_CLIENT_SECRET,
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    } catch (error) {
      logger.error('Logout failed', error);
      throw new Error('Failed to logout');
    }
  }

  /**
   * Get user info from access token
   */
  async getUserInfo(accessToken: string): Promise<KeycloakUserInfo> {
    try {
      const response = await axios.get(
        `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get user info', error);
      throw new Error('Failed to get user info');
    }
  }

  /**
   * Introspect token (validate and get token details)
   */
  async introspectToken(token: string): Promise<any> {
    try {
      const response = await axios.post(
        `${env.KEYCLOAK_URL}/realms/${env.KEYCLOAK_REALM}/protocol/openid-connect/token/introspect`,
        new URLSearchParams({
          client_id: env.KEYCLOAK_CLIENT_ID,
          client_secret: env.KEYCLOAK_CLIENT_SECRET,
          token,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Token introspection failed', error);
      throw new Error('Failed to introspect token');
    }
  }

  /**
   * Create new user in Keycloak
   */
  async createUser(userData: {
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    enabled?: boolean;
  }): Promise<string> {
    const token = await this.getAdminToken();

    try {
      const response = await this.client.post(
        `/admin/realms/${env.KEYCLOAK_REALM}/users`,
        {
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          enabled: userData.enabled ?? true,
          emailVerified: false,
          credentials: userData.password
            ? [
                {
                  type: 'password',
                  value: userData.password,
                  temporary: false,
                },
              ]
            : [],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Extract user ID from Location header
      const location = response.headers.location;
      const userId = location?.split('/').pop();

      if (!userId) {
        throw new Error('Failed to extract user ID from response');
      }

      logger.info('User created in Keycloak', { userId, username: userData.username });
      return userId;
    } catch (error: any) {
      logger.error('Failed to create user in Keycloak', error);
      throw new Error(error.response?.data?.errorMessage || 'Failed to create user');
    }
  }

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<KeycloakUser> {
    const token = await this.getAdminToken();

    try {
      const response = await this.client.get(
        `/admin/realms/${env.KEYCLOAK_REALM}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get user from Keycloak', { userId, error });
      throw new Error('User not found');
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<KeycloakUser>): Promise<void> {
    const token = await this.getAdminToken();

    try {
      await this.client.put(
        `/admin/realms/${env.KEYCLOAK_REALM}/users/${userId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      logger.info('User updated in Keycloak', { userId });
    } catch (error) {
      logger.error('Failed to update user in Keycloak', { userId, error });
      throw new Error('Failed to update user');
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    const token = await this.getAdminToken();

    try {
      await this.client.delete(
        `/admin/realms/${env.KEYCLOAK_REALM}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      logger.info('User deleted from Keycloak', { userId });
    } catch (error) {
      logger.error('Failed to delete user from Keycloak', { userId, error });
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<any[]> {
    const token = await this.getAdminToken();

    try {
      const response = await this.client.get(
        `/admin/realms/${env.KEYCLOAK_REALM}/users/${userId}/role-mappings/realm`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get user roles', { userId, error });
      throw new Error('Failed to get user roles');
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string, roleName: string): Promise<void> {
    const token = await this.getAdminToken();

    try {
      await this.client.post(
        `/admin/realms/${env.KEYCLOAK_REALM}/users/${userId}/role-mappings/realm`,
        [
          {
            id: roleId,
            name: roleName,
          },
        ],
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      logger.info('Role assigned to user', { userId, roleName });
    } catch (error) {
      logger.error('Failed to assign role', { userId, roleName, error });
      throw new Error('Failed to assign role');
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(userId: string): Promise<void> {
    const token = await this.getAdminToken();

    try {
      await this.client.put(
        `/admin/realms/${env.KEYCLOAK_REALM}/users/${userId}/send-verify-email`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      logger.info('Verification email sent', { userId });
    } catch (error) {
      logger.error('Failed to send verification email', { userId, error });
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Reset password
   */
  async resetPassword(userId: string, newPassword: string, temporary: boolean = false): Promise<void> {
    const token = await this.getAdminToken();

    try {
      await this.client.put(
        `/admin/realms/${env.KEYCLOAK_REALM}/users/${userId}/reset-password`,
        {
          type: 'password',
          value: newPassword,
          temporary,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      logger.info('Password reset successful', { userId });
    } catch (error) {
      logger.error('Failed to reset password', { userId, error });
      throw new Error('Failed to reset password');
    }
  }
}

// Export singleton instance
export const keycloakClient = new KeycloakClient();
