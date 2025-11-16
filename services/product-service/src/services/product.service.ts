/**
 * Product Service - Business logic layer
 */

import { Product } from '@prisma/client';
import { ProductRepository } from '../repositories/product.repository';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  logger,
  slugify,
  getRabbitMQ,
} from '@ecommerce/shared';
import {
  CreateProductInput,
  UpdateProductInput,
  QueryProductsInput,
} from '../api/validators/product.validator';
import { ProductEventType } from '@ecommerce/shared';

export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  /**
   * Create a new product
   */
  async createProduct(data: CreateProductInput): Promise<Product> {
    logger.info('Creating product', { sku: data.sku, name: data.name });

    // Generate slug from name
    const slug = slugify(data.name);

    // Check if product with same SKU exists
    const existingBySku = await this.productRepository.findBySku(data.sku);
    if (existingBySku) {
      throw new ConflictError(`Product with SKU ${data.sku} already exists`);
    }

    // Check if product with same slug exists
    const existingBySlug = await this.productRepository.findBySlug(slug);
    if (existingBySlug) {
      // Append random suffix to make slug unique
      const uniqueSlug = `${slug}-${Date.now().toString(36)}`;
      logger.warn('Slug conflict, using unique slug', { originalSlug: slug, uniqueSlug });
    }

    // Create product
    const product = await this.productRepository.create({
      ...data,
      slug: existingBySlug ? `${slug}-${Date.now().toString(36)}` : slug,
    });

    // Publish product created event
    try {
      const rabbitmq = getRabbitMQ();
      if (rabbitmq.isConnected()) {
        await rabbitmq.publish('ecommerce.events', 'product.created', {
          id: crypto.randomUUID(),
          type: ProductEventType.CREATED,
          timestamp: new Date().toISOString(),
          source: 'product-service',
          data: {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            price: Number(product.price),
            categoryId: product.categoryId || undefined,
            stock: product.stockQuantity,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to publish product created event', error as Error);
      // Don't fail the request if event publishing fails
    }

    logger.info('Product created successfully', {
      productId: product.id,
      sku: product.sku,
    });

    return product;
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);

    if (!product || product.deletedAt) {
      throw new NotFoundError('Product');
    }

    // Increment view count asynchronously (fire and forget)
    this.productRepository.incrementViewCount(id).catch((err) => {
      logger.error('Failed to increment view count', err, { productId: id });
    });

    return product;
  }

  /**
   * Get product by slug
   */
  async getProductBySlug(slug: string): Promise<Product> {
    const product = await this.productRepository.findBySlug(slug);

    if (!product || product.deletedAt) {
      throw new NotFoundError('Product');
    }

    // Increment view count asynchronously
    this.productRepository.incrementViewCount(product.id).catch((err) => {
      logger.error('Failed to increment view count', err, { productId: product.id });
    });

    return product;
  }

  /**
   * List products with filters and pagination
   */
  async listProducts(params: QueryProductsInput) {
    const { products, total } = await this.productRepository.findMany(params);

    return {
      data: products,
      pagination: {
        currentPage: params.page,
        totalPages: Math.ceil(total / params.limit),
        totalItems: total,
        itemsPerPage: params.limit,
        hasNextPage: params.page < Math.ceil(total / params.limit),
        hasPrevPage: params.page > 1,
      },
    };
  }

  /**
   * Update product
   */
  async updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
    const existingProduct = await this.getProductById(id);

    // Update slug if name changed
    const updateData: any = { ...data };
    if (data.name && data.name !== existingProduct.name) {
      updateData.slug = slugify(data.name);
    }

    // Check for SKU conflict if SKU is being changed
    if (data.sku && data.sku !== existingProduct.sku) {
      const conflictProduct = await this.productRepository.findBySku(data.sku);
      if (conflictProduct && conflictProduct.id !== id) {
        throw new ConflictError(`Product with SKU ${data.sku} already exists`);
      }
    }

    const updatedProduct = await this.productRepository.update(id, updateData);

    // Publish product updated event
    try {
      const rabbitmq = getRabbitMQ();
      if (rabbitmq.isConnected()) {
        await rabbitmq.publish('ecommerce.events', 'product.updated', {
          id: crypto.randomUUID(),
          type: ProductEventType.UPDATED,
          timestamp: new Date().toISOString(),
          source: 'product-service',
          data: {
            productId: updatedProduct.id,
            sku: updatedProduct.sku,
            changes: data,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to publish product updated event', error as Error);
    }

    logger.info('Product updated', { productId: id });

    return updatedProduct;
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(id: string): Promise<void> {
    await this.getProductById(id); // Verify exists and not deleted

    await this.productRepository.delete(id);

    // Publish product deleted event
    try {
      const rabbitmq = getRabbitMQ();
      if (rabbitmq.isConnected()) {
        await rabbitmq.publish('ecommerce.events', 'product.deleted', {
          id: crypto.randomUUID(),
          type: ProductEventType.DELETED,
          timestamp: new Date().toISOString(),
          source: 'product-service',
          data: {
            productId: id,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to publish product deleted event', error as Error);
    }

    logger.info('Product deleted', { productId: id });
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 10): Promise<Product[]> {
    return await this.productRepository.getFeatured(limit);
  }

  /**
   * Get new products
   */
  async getNewProducts(limit: number = 10): Promise<Product[]> {
    return await this.productRepository.getNew(limit);
  }

  /**
   * Get on-sale products
   */
  async getOnSaleProducts(limit: number = 10): Promise<Product[]> {
    return await this.productRepository.getOnSale(limit);
  }

  /**
   * Get best-selling products
   */
  async getBestSellers(limit: number = 10): Promise<Product[]> {
    return await this.productRepository.getBestSellers(limit);
  }

  /**
   * Update stock quantity
   */
  async updateStock(id: string, quantity: number): Promise<Product> {
    if (quantity < 0) {
      throw new BadRequestError('Stock quantity cannot be negative');
    }

    const product = await this.getProductById(id);
    const previousStock = product.stockQuantity;

    const updatedProduct = await this.productRepository.updateStock(id, quantity);

    // Publish stock changed event
    try {
      const rabbitmq = getRabbitMQ();
      if (rabbitmq.isConnected()) {
        await rabbitmq.publish('ecommerce.events', 'product.stock.changed', {
          id: crypto.randomUUID(),
          type: ProductEventType.STOCK_CHANGED,
          timestamp: new Date().toISOString(),
          source: 'product-service',
          data: {
            productId: id,
            sku: product.sku,
            previousStock,
            newStock: quantity,
            reason: 'adjustment',
          },
        });
      }
    } catch (error) {
      logger.error('Failed to publish stock changed event', error as Error);
    }

    logger.info('Stock updated', { productId: id, previousStock, newStock: quantity });

    return updatedProduct;
  }
}
