/**
 * Environment configuration with validation
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Service
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3003'),
  SERVICE_NAME: z.string().default('order-service'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),
  REDIS_DB: z.string().transform(Number).pipe(z.number().min(0)).default('2'),

  // RabbitMQ
  RABBITMQ_URL: z.string().url(),

  // External Services
  PRODUCT_SERVICE_URL: z.string().url(),
  AUTH_SERVICE_URL: z.string().url(),
  PAYMENT_SERVICE_URL: z.string().url(),
  INVENTORY_SERVICE_URL: z.string().url(),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().positive()).default('60000'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // Order Configuration
  ORDER_NUMBER_PREFIX: z.string().default('ORD'),
  ORDER_CANCELLATION_WINDOW: z.string().transform(Number).pipe(z.number().positive()).default('86400000'),
  ORDER_PAYMENT_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('900000'),
});

type Env = z.infer<typeof envSchema>;

const parseEnv = (): Env => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
