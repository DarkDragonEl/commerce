/**
 * Prometheus metrics for microservices
 */

import promClient, { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../utils/logger';

export interface MetricsConfig {
  serviceName: string;
  enableDefaultMetrics?: boolean;
  defaultMetricsPrefix?: string;
}

export class MetricsService {
  private registry: Registry;
  private serviceName: string;

  // HTTP Metrics
  public httpRequestTotal: Counter;
  public httpRequestDuration: Histogram;
  public httpRequestSizeBytes: Histogram;
  public httpResponseSizeBytes: Histogram;

  // Database Metrics
  public dbQueryDuration: Histogram;
  public dbQueryTotal: Counter;
  public dbConnectionsActive: Gauge;

  // Business Metrics
  public businessEventsTotal: Counter;
  public businessOperationDuration: Histogram;

  // Cache Metrics
  public cacheHits: Counter;
  public cacheMisses: Counter;
  public cacheOperationDuration: Histogram;

  // Queue Metrics
  public queueMessagesPublished: Counter;
  public queueMessagesConsumed: Counter;
  public queueMessageProcessingDuration: Histogram;

  constructor(config: MetricsConfig) {
    this.serviceName = config.serviceName;
    this.registry = new Registry();

    // Set default labels
    this.registry.setDefaultLabels({
      service: this.serviceName,
      environment: process.env.NODE_ENV || 'development',
    });

    // Enable default metrics (CPU, memory, etc.)
    if (config.enableDefaultMetrics !== false) {
      promClient.collectDefaultMetrics({
        register: this.registry,
        prefix: config.defaultMetricsPrefix || 'nodejs_',
      });
    }

    // Initialize HTTP metrics
    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestSizeBytes = new Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
      registers: [this.registry],
    });

    this.httpResponseSizeBytes = new Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
      registers: [this.registry],
    });

    // Initialize Database metrics
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.registry],
    });

    this.dbQueryTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table', 'status'],
      registers: [this.registry],
    });

    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });

    // Initialize Business metrics
    this.businessEventsTotal = new Counter({
      name: 'business_events_total',
      help: 'Total number of business events',
      labelNames: ['event_type', 'status'],
      registers: [this.registry],
    });

    this.businessOperationDuration = new Histogram({
      name: 'business_operation_duration_seconds',
      help: 'Duration of business operations',
      labelNames: ['operation', 'status'],
      buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    // Initialize Cache metrics
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_key_prefix'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_key_prefix'],
      registers: [this.registry],
    });

    this.cacheOperationDuration = new Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Duration of cache operations',
      labelNames: ['operation', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1],
      registers: [this.registry],
    });

    // Initialize Queue metrics
    this.queueMessagesPublished = new Counter({
      name: 'queue_messages_published_total',
      help: 'Total number of messages published to queue',
      labelNames: ['exchange', 'routing_key'],
      registers: [this.registry],
    });

    this.queueMessagesConsumed = new Counter({
      name: 'queue_messages_consumed_total',
      help: 'Total number of messages consumed from queue',
      labelNames: ['queue', 'status'],
      registers: [this.registry],
    });

    this.queueMessageProcessingDuration = new Histogram({
      name: 'queue_message_processing_duration_seconds',
      help: 'Duration of queue message processing',
      labelNames: ['queue', 'status'],
      buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30],
      registers: [this.registry],
    });

    logger.info('Metrics service initialized', { service: this.serviceName });
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
    requestSizeBytes?: number,
    responseSizeBytes?: number
  ): void {
    this.httpRequestTotal.labels(method, route, statusCode.toString()).inc();
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(durationSeconds);

    if (requestSizeBytes !== undefined) {
      this.httpRequestSizeBytes.labels(method, route).observe(requestSizeBytes);
    }

    if (responseSizeBytes !== undefined) {
      this.httpResponseSizeBytes.labels(method, route).observe(responseSizeBytes);
    }
  }

  /**
   * Record database query
   */
  recordDbQuery(operation: string, table: string, durationSeconds: number, status: 'success' | 'error' = 'success'): void {
    this.dbQueryTotal.labels(operation, table, status).inc();
    this.dbQueryDuration.labels(operation, table, status).observe(durationSeconds);
  }

  /**
   * Set active database connections
   */
  setDbConnectionsActive(count: number): void {
    this.dbConnectionsActive.set(count);
  }

  /**
   * Record business event
   */
  recordBusinessEvent(eventType: string, status: 'success' | 'error' = 'success'): void {
    this.businessEventsTotal.labels(eventType, status).inc();
  }

  /**
   * Record business operation duration
   */
  recordBusinessOperation(operation: string, durationSeconds: number, status: 'success' | 'error' = 'success'): void {
    this.businessOperationDuration.labels(operation, status).observe(durationSeconds);
  }

  /**
   * Record cache hit
   */
  recordCacheHit(keyPrefix: string = 'default'): void {
    this.cacheHits.labels(keyPrefix).inc();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(keyPrefix: string = 'default'): void {
    this.cacheMisses.labels(keyPrefix).inc();
  }

  /**
   * Record cache operation
   */
  recordCacheOperation(operation: string, durationSeconds: number, status: 'success' | 'error' = 'success'): void {
    this.cacheOperationDuration.labels(operation, status).observe(durationSeconds);
  }

  /**
   * Record queue message published
   */
  recordQueuePublish(exchange: string, routingKey: string): void {
    this.queueMessagesPublished.labels(exchange, routingKey).inc();
  }

  /**
   * Record queue message consumed
   */
  recordQueueConsume(queue: string, status: 'success' | 'error' = 'success'): void {
    this.queueMessagesConsumed.labels(queue, status).inc();
  }

  /**
   * Record queue message processing duration
   */
  recordQueueProcessing(queue: string, durationSeconds: number, status: 'success' | 'error' = 'success'): void {
    this.queueMessageProcessingDuration.labels(queue, status).observe(durationSeconds);
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  /**
   * Get metrics as JSON
   */
  async getMetricsJSON(): Promise<any[]> {
    return await this.registry.getMetricsAsJSON();
  }

  /**
   * Get registry
   */
  getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  resetMetrics(): void {
    this.registry.resetMetrics();
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.registry.clear();
  }
}

// Singleton instance
let metricsInstance: MetricsService | null = null;

/**
 * Initialize metrics service
 */
export function initMetrics(config: MetricsConfig): MetricsService {
  if (metricsInstance) {
    logger.warn('Metrics service already initialized');
    return metricsInstance;
  }

  metricsInstance = new MetricsService(config);
  return metricsInstance;
}

/**
 * Get metrics service instance
 */
export function getMetrics(): MetricsService {
  if (!metricsInstance) {
    throw new Error('Metrics service not initialized. Call initMetrics() first.');
  }
  return metricsInstance;
}

export default MetricsService;
