/**
 * Product Controller - HTTP request handlers
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ProductService } from '../../services/product.service';
import {
  CreateProductSchema,
  UpdateProductSchema,
  QueryProductsSchema,
  CreateProductInput,
  UpdateProductInput,
  QueryProductsInput,
} from '../validators/product.validator';
import { validateData, logger } from '@ecommerce/shared';

export class ProductController {
  constructor(private productService: ProductService) {}

  /**
   * Create a new product
   * POST /api/v1/products
   */
  async createProduct(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = validateData(CreateProductSchema, request.body);
      const product = await this.productService.createProduct(data);

      return reply.status(201).send({
        success: true,
        data: product,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get product by ID
   * GET /api/v1/products/:id
   */
  async getProductById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const product = await this.productService.getProductById(id);

      return reply.status(200).send({
        success: true,
        data: product,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get product by slug
   * GET /api/v1/products/slug/:slug
   */
  async getProductBySlug(request: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) {
    try {
      const { slug } = request.params;
      const product = await this.productService.getProductBySlug(slug);

      return reply.status(200).send({
        success: true,
        data: product,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * List products with filters
   * GET /api/v1/products
   */
  async listProducts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = validateData(QueryProductsSchema, request.query);
      const result = await this.productService.listProducts(params);

      return reply.status(200).send({
        success: true,
        ...result,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update product
   * PUT /api/v1/products/:id
   */
  async updateProduct(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const data = validateData(UpdateProductSchema, request.body);
      const product = await this.productService.updateProduct(id, data);

      return reply.status(200).send({
        success: true,
        data: product,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete product
   * DELETE /api/v1/products/:id
   */
  async deleteProduct(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      await this.productService.deleteProduct(id);

      return reply.status(200).send({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get featured products
   * GET /api/v1/products/featured
   */
  async getFeaturedProducts(request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 10;
      const products = await this.productService.getFeaturedProducts(limit);

      return reply.status(200).send({
        success: true,
        data: products,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get new products
   * GET /api/v1/products/new
   */
  async getNewProducts(request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 10;
      const products = await this.productService.getNewProducts(limit);

      return reply.status(200).send({
        success: true,
        data: products,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get on-sale products
   * GET /api/v1/products/on-sale
   */
  async getOnSaleProducts(request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 10;
      const products = await this.productService.getOnSaleProducts(limit);

      return reply.status(200).send({
        success: true,
        data: products,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get best-selling products
   * GET /api/v1/products/best-sellers
   */
  async getBestSellers(request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 10;
      const products = await this.productService.getBestSellers(limit);

      return reply.status(200).send({
        success: true,
        data: products,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update product stock
   * PUT /api/v1/products/:id/stock
   */
  async updateStock(
    request: FastifyRequest<{ Params: { id: string }; Body: { quantity: number } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const { quantity } = request.body;

      const product = await this.productService.updateStock(id, quantity);

      return reply.status(200).send({
        success: true,
        data: product,
      });
    } catch (error) {
      throw error;
    }
  }
}
