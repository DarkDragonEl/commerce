import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3007'),
  SERVICE_NAME: z.string().default('inventory-service'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  REDIS_DB: z.string().transform(Number).default('5'),
  RABBITMQ_URL: z.string().url(),
  RESERVATION_TIMEOUT: z.string().transform(Number).default('900000'),
  LOW_STOCK_THRESHOLD: z.string().transform(Number).default('10'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
});

export const env = envSchema.parse(process.env);
