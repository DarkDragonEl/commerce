/**
 * Product validation schemas using Zod
 */

import { z } from 'zod';
import { ProductStatus } from '@prisma/client';

// Create Product Schema
export const CreateProductSchema = z.object({
  sku: z.string().min(1).max(50).regex(/^[A-Z0-9-]+$/, 'SKU must contain only uppercase letters, numbers, and hyphens'),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  shortDesc: z.string().max(500).optional(),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  costPrice: z.number().positive().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  trackInventory: z.boolean().default(true),
  allowBackorder: z.boolean().default(false),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.DRAFT),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  onSale: z.boolean().default(false),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().optional(),
  primaryImage: z.string().url().optional(),
  categoryId: z.string().uuid().optional(),
});

// Update Product Schema (all fields optional)
export const UpdateProductSchema = CreateProductSchema.partial();

// Query Products Schema
export const QueryProductsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['name', 'price', 'createdAt', 'purchaseCount', 'averageRating']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  isNew: z.coerce.boolean().optional(),
  onSale: z.coerce.boolean().optional(),
  priceMin: z.coerce.number().positive().optional(),
  priceMax: z.coerce.number().positive().optional(),
});

// Product Variant Schema
export const CreateVariantSchema = z.object({
  sku: z.string().min(1).max(50).regex(/^[A-Z0-9-]+$/),
  name: z.string().min(1).max(200),
  price: z.number().positive().optional(),
  compareAtPrice: z.number().positive().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  options: z.record(z.string(), z.any()), // {size: "L", color: "Red"}
  image: z.string().url().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const UpdateVariantSchema = CreateVariantSchema.partial();

// Product Image Schema
export const CreateImageSchema = z.object({
  url: z.string().url(),
  altText: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

// Product Attribute Schema
export const CreateAttributeSchema = z.object({
  name: z.string().min(1).max(100),
  value: z.string().min(1).max(500),
});

// Category Schema
export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  image: z.string().url().optional(),
  parentId: z.string().uuid().optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type QueryProductsInput = z.infer<typeof QueryProductsSchema>;
export type CreateVariantInput = z.infer<typeof CreateVariantSchema>;
export type UpdateVariantInput = z.infer<typeof UpdateVariantSchema>;
export type CreateImageInput = z.infer<typeof CreateImageSchema>;
export type CreateAttributeInput = z.infer<typeof CreateAttributeSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
