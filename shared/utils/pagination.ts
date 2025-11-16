/**
 * Pagination utilities for consistent pagination across services
 */

import { PaginationParams, PaginationMeta, PaginatedResponse } from '../types/common.types';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Normalize pagination parameters
 */
export function normalizePaginationParams(params: Partial<PaginationParams>): PaginationParams {
  const page = Math.max(1, params.page || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit || DEFAULT_LIMIT));

  return {
    page,
    limit,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder || 'desc',
  };
}

/**
 * Calculate skip value for database queries
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Calculate total pages
 */
export function calculateTotalPages(totalItems: number, limit: number): number {
  return Math.ceil(totalItems / limit);
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  totalItems: number
): PaginationMeta {
  const totalPages = calculateTotalPages(totalItems, limit);

  return {
    currentPage: page,
    totalPages,
    totalItems,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  totalItems: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: createPaginationMeta(page, limit, totalItems),
  };
}

/**
 * Parse pagination query parameters from request
 */
export function parsePaginationQuery(query: Record<string, any>): PaginationParams {
  return normalizePaginationParams({
    page: query.page ? parseInt(query.page as string, 10) : undefined,
    limit: query.limit ? parseInt(query.limit as string, 10) : undefined,
    sortBy: query.sortBy as string,
    sortOrder: query.sortOrder as 'asc' | 'desc',
  });
}

/**
 * Get Prisma pagination args
 */
export function getPrismaPaginationArgs(params: PaginationParams) {
  const { page, limit, sortBy, sortOrder } = params;

  return {
    skip: calculateSkip(page, limit),
    take: limit,
    orderBy: sortBy ? { [sortBy]: sortOrder } : undefined,
  };
}
