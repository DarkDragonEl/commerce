/**
 * Environment configuration with validation
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Service
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3004'),
  SERVICE_NAME: z.string().default('payment-service'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),
  REDIS_DB: z.string().transform(Number).pipe(z.number().min(0)).default('3'),

  // RabbitMQ
  RABBITMQ_URL: z.string().url(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_API_VERSION: z.string().default('2023-10-16'),

  // External Services
  ORDER_SERVICE_URL: z.string().url(),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).pipe(z.number().positive()).default('60000'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // Payment Configuration
  PAYMENT_CURRENCY: z.string().default('USD'),
  PAYMENT_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('900000'),
  REFUND_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('86400000'),
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
