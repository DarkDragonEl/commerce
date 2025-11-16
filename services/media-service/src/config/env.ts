import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3008'),
  SERVICE_NAME: z.string().default('media-service'),
  DATABASE_URL: z.string().url(),
  MINIO_ENDPOINT: z.string(),
  MINIO_PORT: z.string().transform(Number).default('9000'),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_USE_SSL: z.string().transform(v => v === 'true').default('false'),
  MINIO_BUCKET: z.string().default('ecommerce-media'),
  REDIS_URL: z.string().url(),
  REDIS_DB: z.string().transform(Number).default('6'),
  RABBITMQ_URL: z.string().url(),
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
  ALLOWED_TYPES: z.string().default('image/jpeg,image/png'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
});

export const env = envSchema.parse(process.env);
