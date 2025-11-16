import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3006'),
  SERVICE_NAME: z.string().default('email-service'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  REDIS_DB: z.string().transform(Number).default('4'),
  RABBITMQ_URL: z.string().url(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.string().transform(Number),
  SMTP_SECURE: z.string().transform(v => v === 'true').default('false'),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM_NAME: z.string().default('E-Commerce'),
  SMTP_FROM_EMAIL: z.string().email(),
  EMAIL_MAX_RETRY: z.string().transform(Number).default('3'),
  EMAIL_RETRY_DELAY: z.string().transform(Number).default('60000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
});

export const env = envSchema.parse(process.env);
