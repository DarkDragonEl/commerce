/**
 * Common types used across all microservices
 */

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: Record<string, any>;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    database?: HealthCheck;
    redis?: HealthCheck;
    rabbitmq?: HealthCheck;
    [key: string]: HealthCheck | undefined;
  };
}

export interface HealthCheck {
  status: 'up' | 'down';
  responseTime?: number;
  message?: string;
}

export interface ServiceConfig {
  name: string;
  version: string;
  port: number;
  env: 'development' | 'staging' | 'production' | 'test';
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  userRole?: string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  MODERATOR = 'MODERATOR',
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface Address {
  id?: string;
  type: 'shipping' | 'billing';
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

export interface Money {
  amount: number;
  currency: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface FilterOperator {
  $eq?: any;
  $ne?: any;
  $gt?: any;
  $gte?: any;
  $lt?: any;
  $lte?: any;
  $in?: any[];
  $nin?: any[];
  $like?: string;
  $ilike?: string;
}

export type FilterQuery<T> = {
  [K in keyof T]?: T[K] | FilterOperator;
};

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}
