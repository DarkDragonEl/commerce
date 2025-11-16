/**
 * Shared libraries main export
 * Central export point for all shared utilities, types, clients, and middleware
 */

// Types
export * from './types/common.types';
export * from './types/events.types';

// Utils
export * from './utils/logger';
export * from './utils/errors';
export * from './utils/pagination';
export * from './utils/validation';

// Clients
export * from './clients/redis.client';
export * from './clients/rabbitmq.client';

// Monitoring
export * from './monitoring/metrics';

// Re-export commonly used external dependencies
export { z } from 'zod';
export type { ZodSchema, ZodError } from 'zod';
