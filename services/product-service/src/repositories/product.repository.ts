/**
 * Product Repository - Data access layer
 */

import { Prisma, Product, ProductStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { QueryProductsInput } from '../api/validators/product.validator';

export class ProductRepository {
  /**
   * Create a new product
   */
  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return await prisma.product.create({
      data,
      include: {
        category: true,
        images: true,
        variants: true,
        attributes: true,
      },
    });
  }

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<Product | null> {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        attributes: true,
        relatedTo: {
          include: {
            relatedProduct: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                primaryImage: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Find product by slug
   */
  async findBySlug(slug: string): Promise<Product | null> {
    return await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        variants: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        attributes: true,
      },
    });
  }

  /**
   * Find product by SKU
   */
  async findBySku(sku: string): Promise<Product | null> {
    return await prisma.product.findUnique({
      where: { sku },
    });
  }

  /**
   * Find many products with filters
   */
  async findMany(params: QueryProductsInput) {
    const where: Prisma.ProductWhereInput = {
      deletedAt: null, // Exclude soft-deleted products
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: 'insensitive' } },
          { description: { contains: params.search, mode: 'insensitive' } },
          { sku: { contains: params.search, mode: 'insensitive' } },
        ],
      }),
      ...(params.categoryId && { categoryId: params.categoryId }),
      ...(params.status && { status: params.status }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.isFeatured !== undefined && { isFeatured: params.isFeatured }),
      ...(params.isNew !== undefined && { isNew: params.isNew }),
      ...(params.onSale !== undefined && { onSale: params.onSale }),
      ...((params.priceMin || params.priceMax) && {
        price: {
          ...(params.priceMin && { gte: params.priceMin }),
          ...(params.priceMax && { lte: params.priceMax }),
        },
      }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
        },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  /**
   * Update product
   */
  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return await prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        images: true,
        variants: true,
        attributes: true,
      },
    });
  }

  /**
   * Soft delete product
   */
  async delete(id: string): Promise<Product> {
    return await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<void> {
    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  /**
   * Update stock quantity
   */
  async updateStock(id: string, quantity: number): Promise<Product> {
    return await prisma.product.update({
      where: { id },
      data: { stockQuantity: quantity },
    });
  }

  /**
   * Get featured products
   */
  async getFeatured(limit: number = 10): Promise<Product[]> {
    return await prisma.product.findMany({
      where: {
        isFeatured: true,
        isActive: true,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        category: true,
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get new products
   */
  async getNew(limit: number = 10): Promise<Product[]> {
    return await prisma.product.findMany({
      where: {
        isNew: true,
        isActive: true,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        category: true,
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get on-sale products
   */
  async getOnSale(limit: number = 10): Promise<Product[]> {
    return await prisma.product.findMany({
      where: {
        onSale: true,
        isActive: true,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        category: true,
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get best-selling products
   */
  async getBestSellers(limit: number = 10): Promise<Product[]> {
    return await prisma.product.findMany({
      where: {
        isActive: true,
        status: ProductStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        category: true,
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
      },
      take: limit,
      orderBy: { purchaseCount: 'desc' },
    });
  }
}
