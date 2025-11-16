/**
 * Structured logger using Winston
 * Provides consistent logging across all microservices
 */

import winston from 'winston';

export interface LoggerConfig {
  service?: string;
  level?: string;
  format?: 'json' | 'pretty';
  environment?: string;
}

class Logger {
  private logger: winston.Logger;
  private serviceName: string;

  constructor(config: LoggerConfig = {}) {
    this.serviceName = config.service || process.env.SERVICE_NAME || 'unknown-service';

    const logLevel = config.level || process.env.LOG_LEVEL || 'info';
    const logFormat = config.format || (process.env.NODE_ENV === 'production' ? 'json' : 'pretty');
    const environment = config.environment || process.env.NODE_ENV || 'development';

    // Custom format for pretty printing
    const prettyFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
      const meta = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
      return `${timestamp} [${level}] [${this.serviceName}]: ${message} ${meta}`;
    });

    // JSON format for production
    const jsonFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    // Pretty format for development
    const devFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      prettyFormat
    );

    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormat === 'json' ? jsonFormat : devFormat,
      defaultMeta: {
        service: this.serviceName,
        environment,
        hostname: process.env.HOSTNAME || 'localhost',
      },
      transports: [
        new winston.transports.Console({
          handleExceptions: true,
          handleRejections: true,
        }),
      ],
      exitOnError: false,
    });

    // Add file transport for production
    if (environment === 'production') {
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      );
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      );
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log info message
   */
  info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | Record<string, any>, meta?: Record<string, any>): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        ...meta,
      });
    } else {
      this.logger.error(message, { ...error, ...meta });
    }
  }

  /**
   * Log HTTP request
   */
  http(message: string, meta?: Record<string, any>): void {
    this.logger.http(message, meta);
  }

  /**
   * Create child logger with additional metadata
   */
  child(meta: Record<string, any>): winston.Logger {
    return this.logger.child(meta);
  }

  /**
   * Log with custom level
   */
  log(level: string, message: string, meta?: Record<string, any>): void {
    this.logger.log(level, message, meta);
  }
}

// Singleton instance
let loggerInstance: Logger;

/**
 * Get or create logger instance
 */
export function getLogger(config?: LoggerConfig): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(config);
  }
  return loggerInstance;
}

/**
 * Initialize logger with config (call once at app startup)
 */
export function initLogger(config: LoggerConfig): Logger {
  loggerInstance = new Logger(config);
  return loggerInstance;
}

/**
 * Default logger export
 */
export const logger = getLogger();

export default logger;
