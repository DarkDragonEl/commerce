/**
 * Product Routes
 */

import { FastifyInstance } from 'fastify';
import { ProductController } from '../controllers/product.controller';
import { ProductService } from '../../services/product.service';
import { ProductRepository } from '../../repositories/product.repository';

export async function productRoutes(fastify: FastifyInstance) {
  // Initialize dependencies
  const productRepository = new ProductRepository();
  const productService = new ProductService(productRepository);
  const productController = new ProductController(productService);

  // Public routes
  fastify.get(
    '/featured',
    {
      schema: {
        description: 'Get featured products',
        tags: ['products'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
            },
          },
        },
      },
    },
    (req, reply) => productController.getFeaturedProducts(req, reply)
  );

  fastify.get(
    '/new',
    {
      schema: {
        description: 'Get new products',
        tags: ['products'],
      },
    },
    (req, reply) => productController.getNewProducts(req, reply)
  );

  fastify.get(
    '/on-sale',
    {
      schema: {
        description: 'Get products on sale',
        tags: ['products'],
      },
    },
    (req, reply) => productController.getOnSaleProducts(req, reply)
  );

  fastify.get(
    '/best-sellers',
    {
      schema: {
        description: 'Get best-selling products',
        tags: ['products'],
      },
    },
    (req, reply) => productController.getBestSellers(req, reply)
  );

  fastify.get(
    '/slug/:slug',
    {
      schema: {
        description: 'Get product by slug',
        tags: ['products'],
        params: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
          },
          required: ['slug'],
        },
      },
    },
    (req, reply) => productController.getProductBySlug(req, reply)
  );

  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get product by ID',
        tags: ['products'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
      },
    },
    (req, reply) => productController.getProductById(req, reply)
  );

  fastify.get(
    '/',
    {
      schema: {
        description: 'List products with filters',
        tags: ['products'],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'number', default: 1 },
            limit: { type: 'number', default: 20 },
            sortBy: { type: 'string', enum: ['name', 'price', 'createdAt', 'purchaseCount', 'averageRating'] },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
            search: { type: 'string' },
            categoryId: { type: 'string' },
            status: { type: 'string' },
            isActive: { type: 'boolean' },
            isFeatured: { type: 'boolean' },
            isNew: { type: 'boolean' },
            onSale: { type: 'boolean' },
            priceMin: { type: 'number' },
            priceMax: { type: 'number' },
          },
        },
      },
    },
    (req, reply) => productController.listProducts(req, reply)
  );

  // Protected routes (require authentication)
  // Note: Authentication middleware would be added in production
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new product',
        tags: ['products'],
        body: {
          type: 'object',
          required: ['sku', 'name', 'price'],
          properties: {
            sku: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            stockQuantity: { type: 'number' },
            categoryId: { type: 'string' },
          },
        },
      },
    },
    (req, reply) => productController.createProduct(req, reply)
  );

  fastify.put(
    '/:id',
    {
      schema: {
        description: 'Update product',
        tags: ['products'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (req, reply) => productController.updateProduct(req, reply)
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete product',
        tags: ['products'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    (req, reply) => productController.deleteProduct(req, reply)
  );

  fastify.put(
    '/:id/stock',
    {
      schema: {
        description: 'Update product stock',
        tags: ['products'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['quantity'],
          properties: {
            quantity: { type: 'number' },
          },
        },
      },
    },
    (req, reply) => productController.updateStock(req, reply)
  );
}
