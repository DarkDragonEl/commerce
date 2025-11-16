/**
 * RabbitMQ Client for event-driven communication
 */

import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib';
import { logger } from '../utils/logger';
import { DomainEvent } from '../types/events.types';

export interface RabbitMQConfig {
  url: string;
  exchanges?: ExchangeConfig[];
  queues?: QueueConfig[];
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
}

export interface ExchangeConfig {
  name: string;
  type: 'direct' | 'topic' | 'fanout' | 'headers';
  options?: {
    durable?: boolean;
    autoDelete?: boolean;
  };
}

export interface QueueConfig {
  name: string;
  options?: {
    durable?: boolean;
    exclusive?: boolean;
    autoDelete?: boolean;
    arguments?: Record<string, any>;
  };
  bindings?: Array<{
    exchange: string;
    routingKey: string;
  }>;
}

export type MessageHandler<T = any> = (message: T, originalMessage: ConsumeMessage) => Promise<void>;

export class RabbitMQClient {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private config: RabbitMQConfig;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private subscribers: Map<string, MessageHandler> = new Map();

  constructor(config: RabbitMQConfig) {
    this.config = {
      reconnectDelay: 5000,
      maxReconnectAttempts: 10,
      ...config,
    };
  }

  /**
   * Connect to RabbitMQ
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.connection) {
      return;
    }

    this.isConnecting = true;

    try {
      logger.info('Connecting to RabbitMQ...', { url: this.config.url.replace(/\/\/.*@/, '//***@') });

      this.connection = await amqp.connect(this.config.url);

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', err);
        this.handleDisconnect();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.handleDisconnect();
      });

      this.channel = await this.connection.createChannel();

      this.channel.on('error', (err) => {
        logger.error('RabbitMQ channel error', err);
      });

      this.channel.on('close', () => {
        logger.warn('RabbitMQ channel closed');
      });

      // Set prefetch for fair dispatch
      await this.channel.prefetch(1);

      // Setup exchanges and queues
      await this.setupTopology();

      this.reconnectAttempts = 0;
      this.isConnecting = false;

      logger.info('Connected to RabbitMQ successfully');

      // Resubscribe to queues after reconnection
      await this.resubscribe();
    } catch (error) {
      this.isConnecting = false;
      logger.error('Failed to connect to RabbitMQ', error as Error);
      this.handleDisconnect();
      throw error;
    }
  }

  /**
   * Setup exchanges and queues
   */
  private async setupTopology(): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    // Create exchanges
    if (this.config.exchanges) {
      for (const exchange of this.config.exchanges) {
        await this.channel.assertExchange(exchange.name, exchange.type, {
          durable: true,
          ...exchange.options,
        });
        logger.debug('Exchange asserted', { exchange: exchange.name, type: exchange.type });
      }
    }

    // Create queues and bindings
    if (this.config.queues) {
      for (const queue of this.config.queues) {
        await this.channel.assertQueue(queue.name, {
          durable: true,
          ...queue.options,
        });
        logger.debug('Queue asserted', { queue: queue.name });

        // Bind queue to exchanges
        if (queue.bindings) {
          for (const binding of queue.bindings) {
            await this.channel.bindQueue(queue.name, binding.exchange, binding.routingKey);
            logger.debug('Queue bound', {
              queue: queue.name,
              exchange: binding.exchange,
              routingKey: binding.routingKey,
            });
          }
        }
      }
    }
  }

  /**
   * Handle disconnection and reconnect
   */
  private async handleDisconnect(): Promise<void> {
    this.connection = null;
    this.channel = null;

    if (this.reconnectAttempts < (this.config.maxReconnectAttempts || 10)) {
      this.reconnectAttempts++;
      const delay = (this.config.reconnectDelay || 5000) * this.reconnectAttempts;

      logger.info(`Attempting to reconnect to RabbitMQ in ${delay}ms (attempt ${this.reconnectAttempts})...`);

      setTimeout(() => {
        this.connect().catch((err) => {
          logger.error('Reconnection failed', err);
        });
      }, delay);
    } else {
      logger.error('Max reconnection attempts reached. Giving up.');
    }
  }

  /**
   * Resubscribe to queues after reconnection
   */
  private async resubscribe(): Promise<void> {
    for (const [queueName, handler] of this.subscribers) {
      await this.subscribe(queueName, handler);
      logger.info('Resubscribed to queue', { queue: queueName });
    }
  }

  /**
   * Publish event to exchange
   */
  async publish(
    exchange: string,
    routingKey: string,
    event: DomainEvent,
    options?: {
      persistent?: boolean;
      expiration?: number;
      priority?: number;
    }
  ): Promise<boolean> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    try {
      const message = Buffer.from(JSON.stringify(event));

      const result = this.channel.publish(exchange, routingKey, message, {
        persistent: options?.persistent !== false,
        contentType: 'application/json',
        contentEncoding: 'utf-8',
        timestamp: Date.now(),
        expiration: options?.expiration,
        priority: options?.priority,
        messageId: event.id,
        correlationId: event.correlationId,
      });

      if (result) {
        logger.debug('Event published', {
          exchange,
          routingKey,
          eventType: event.type,
          eventId: event.id,
        });
      } else {
        logger.warn('Event not published (buffer full)', {
          exchange,
          routingKey,
          eventType: event.type,
        });
      }

      return result;
    } catch (error) {
      logger.error('Failed to publish event', error as Error, {
        exchange,
        routingKey,
        eventType: event.type,
      });
      throw error;
    }
  }

  /**
   * Subscribe to queue
   */
  async subscribe<T = any>(queueName: string, handler: MessageHandler<T>): Promise<void> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    // Store subscriber for reconnection
    this.subscribers.set(queueName, handler as MessageHandler);

    await this.channel.consume(
      queueName,
      async (msg) => {
        if (!msg) {
          return;
        }

        try {
          const content = JSON.parse(msg.content.toString()) as T;

          logger.debug('Message received', {
            queue: queueName,
            messageId: msg.properties.messageId,
            correlationId: msg.properties.correlationId,
          });

          await handler(content, msg);

          // Acknowledge message
          this.channel?.ack(msg);

          logger.debug('Message processed successfully', {
            queue: queueName,
            messageId: msg.properties.messageId,
          });
        } catch (error) {
          logger.error('Error processing message', error as Error, {
            queue: queueName,
            messageId: msg.properties.messageId,
          });

          // Reject message and requeue (or send to DLQ if configured)
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false }
    );

    logger.info('Subscribed to queue', { queue: queueName });
  }

  /**
   * Send message to queue directly
   */
  async sendToQueue(queueName: string, message: any): Promise<boolean> {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ');
    }

    try {
      const content = Buffer.from(JSON.stringify(message));

      const result = this.channel.sendToQueue(queueName, content, {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      });

      logger.debug('Message sent to queue', { queue: queueName });

      return result;
    } catch (error) {
      logger.error('Failed to send message to queue', error as Error, { queue: queueName });
      throw error;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();

      this.channel = null;
      this.connection = null;
      this.subscribers.clear();

      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection', error as Error);
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}

// Singleton instance
let rabbitMQInstance: RabbitMQClient | null = null;

/**
 * Initialize RabbitMQ client
 */
export function initRabbitMQ(config: RabbitMQConfig): RabbitMQClient {
  if (rabbitMQInstance) {
    logger.warn('RabbitMQ client already initialized');
    return rabbitMQInstance;
  }

  rabbitMQInstance = new RabbitMQClient(config);
  return rabbitMQInstance;
}

/**
 * Get RabbitMQ client instance
 */
export function getRabbitMQ(): RabbitMQClient {
  if (!rabbitMQInstance) {
    throw new Error('RabbitMQ client not initialized. Call initRabbitMQ() first.');
  }
  return rabbitMQInstance;
}

export default RabbitMQClient;
