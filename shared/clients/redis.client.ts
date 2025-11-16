/**
 * Redis Client for caching and session management
 */

import Redis, { RedisOptions } from 'ioredis';
import { logger } from '../utils/logger';

export interface CacheConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  enableOfflineQueue?: boolean;
}

export class RedisClient {
  private client: Redis;
  private config: CacheConfig;
  private reconnectAttempts = 0;

  constructor(config: CacheConfig) {
    this.config = config;

    const options: RedisOptions = {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.reconnectAttempts = times;

        if (times > (config.maxReconnectAttempts || 10)) {
          logger.error('Max Redis reconnection attempts reached');
          return null;
        }

        logger.info(`Retrying Redis connection in ${delay}ms (attempt ${times})`);
        return delay;
      },
      keyPrefix: config.keyPrefix,
      enableOfflineQueue: config.enableOfflineQueue !== false,
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    };

    // Create client from URL or individual params
    if (config.url) {
      this.client = new Redis(config.url, options);
    } else {
      this.client = new Redis({
        host: config.host || 'localhost',
        port: config.port || 6379,
        password: config.password,
        db: config.db || 0,
        ...options,
      });
    }

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.reconnectAttempts = 0;
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', err);
    });

    this.client.on('close', () => {
      logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });

    this.client.on('end', () => {
      logger.warn('Redis connection ended');
    });
  }

  /**
   * Set cache value
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);

      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      logger.debug('Cache set', { key, ttl: ttlSeconds });
    } catch (error) {
      logger.error('Failed to set cache', error as Error, { key });
      throw error;
    }
  }

  /**
   * Get cache value
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);

      if (!value) {
        logger.debug('Cache miss', { key });
        return null;
      }

      logger.debug('Cache hit', { key });
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to get cache', error as Error, { key });
      return null;
    }
  }

  /**
   * Delete cache key
   */
  async del(key: string | string[]): Promise<number> {
    try {
      const keys = Array.isArray(key) ? key : [key];
      const result = await this.client.del(...keys);

      logger.debug('Cache deleted', { keys, count: result });
      return result;
    } catch (error) {
      logger.error('Failed to delete cache', error as Error, { key });
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Failed to check cache existence', error as Error, { key });
      return false;
    }
  }

  /**
   * Set cache with expiration time
   */
  async setex(key: string, seconds: number, value: any): Promise<void> {
    return this.set(key, value, seconds);
  }

  /**
   * Get and delete key
   */
  async getdel<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.get<T>(key);
      if (value) {
        await this.del(key);
      }
      return value;
    } catch (error) {
      logger.error('Failed to getdel cache', error as Error, { key });
      return null;
    }
  }

  /**
   * Increment value
   */
  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Failed to increment cache', error as Error, { key });
      throw error;
    }
  }

  /**
   * Decrement value
   */
  async decr(key: string): Promise<number> {
    try {
      return await this.client.decr(key);
    } catch (error) {
      logger.error('Failed to decrement cache', error as Error, { key });
      throw error;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Failed to set expiration', error as Error, { key, seconds });
      throw error;
    }
  }

  /**
   * Get time to live
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Failed to get TTL', error as Error, { key });
      throw error;
    }
  }

  /**
   * Get keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Failed to get keys', error as Error, { pattern });
      throw error;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      return await this.del(keys);
    } catch (error) {
      logger.error('Failed to delete pattern', error as Error, { pattern });
      throw error;
    }
  }

  /**
   * Add to set
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      logger.error('Failed to add to set', error as Error, { key });
      throw error;
    }
  }

  /**
   * Get set members
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      logger.error('Failed to get set members', error as Error, { key });
      throw error;
    }
  }

  /**
   * Remove from set
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.srem(key, ...members);
    } catch (error) {
      logger.error('Failed to remove from set', error as Error, { key });
      throw error;
    }
  }

  /**
   * Hash set
   */
  async hset(key: string, field: string, value: any): Promise<number> {
    try {
      const serialized = JSON.stringify(value);
      return await this.client.hset(key, field, serialized);
    } catch (error) {
      logger.error('Failed to hash set', error as Error, { key, field });
      throw error;
    }
  }

  /**
   * Hash get
   */
  async hget<T = any>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hget(key, field);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to hash get', error as Error, { key, field });
      return null;
    }
  }

  /**
   * Hash get all
   */
  async hgetall(key: string): Promise<Record<string, any>> {
    try {
      const result = await this.client.hgetall(key);
      const parsed: Record<string, any> = {};

      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }

      return parsed;
    } catch (error) {
      logger.error('Failed to hash get all', error as Error, { key });
      throw error;
    }
  }

  /**
   * Hash delete
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      return await this.client.hdel(key, ...fields);
    } catch (error) {
      logger.error('Failed to hash delete', error as Error, { key, fields });
      throw error;
    }
  }

  /**
   * Flush all keys
   */
  async flushall(): Promise<void> {
    try {
      await this.client.flushall();
      logger.warn('Redis cache flushed');
    } catch (error) {
      logger.error('Failed to flush cache', error as Error);
      throw error;
    }
  }

  /**
   * Ping Redis
   */
  async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      logger.error('Failed to ping Redis', error as Error);
      throw error;
    }
  }

  /**
   * Get Redis info
   */
  async info(): Promise<string> {
    try {
      return await this.client.info();
    } catch (error) {
      logger.error('Failed to get Redis info', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      logger.info('Redis client disconnected');
    } catch (error) {
      logger.error('Failed to disconnect from Redis', error as Error);
      throw error;
    }
  }

  /**
   * Get raw Redis client
   */
  getClient(): Redis {
    return this.client;
  }
}

// Singleton instance
let redisInstance: RedisClient | null = null;

/**
 * Initialize Redis client
 */
export function initRedis(config: CacheConfig): RedisClient {
  if (redisInstance) {
    logger.warn('Redis client already initialized');
    return redisInstance;
  }

  redisInstance = new RedisClient(config);
  return redisInstance;
}

/**
 * Get Redis client instance
 */
export function getRedis(): RedisClient {
  if (!redisInstance) {
    throw new Error('Redis client not initialized. Call initRedis() first.');
  }
  return redisInstance;
}

export default RedisClient;
