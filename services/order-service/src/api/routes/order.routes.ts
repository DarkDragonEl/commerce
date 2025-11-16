/**
 * Order Routes
 */

import { FastifyInstance } from 'fastify';
import { getRabbitMQ } from '@ecommerce/shared';
import { OrderController } from '../controllers/order.controller';
import { OrderService } from '../../services/order.service';
import { OrderRepository } from '../../repositories/order.repository';
import { OrderHistoryRepository } from '../../repositories/order-history.repository';
import { CreateOrderSchema, UpdateOrderStatusSchema, ListOrdersSchema } from '../validators/order.validator';

export async function orderRoutes(app: FastifyInstance) {
  // Initialize repositories
  const orderRepository = new OrderRepository();
  const orderHistoryRepository = new OrderHistoryRepository();

  // Initialize service
  const rabbitmq = getRabbitMQ();
  const orderService = new OrderService(orderRepository, orderHistoryRepository, rabbitmq);

  // Initialize controller
  const controller = new OrderController(orderService);

  // Create order
  app.post('/', {
    schema: {
      description: 'Create a new order',
      tags: ['Orders'],
      body: {
        type: 'object',
        required: ['userId', 'userEmail', 'items', 'shippingAddress'],
      },
    },
    preHandler: async (request, reply) => {
      const result = CreateOrderSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, controller.createOrder.bind(controller));

  // List orders
  app.get('/', {
    schema: {
      description: 'List orders with pagination and filters',
      tags: ['Orders'],
    },
    preHandler: async (request, reply) => {
      const result = ListOrdersSchema.safeParse(request.query);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.query = result.data;
    },
  }, controller.listOrders.bind(controller));

  // Get order by ID
  app.get('/:id', {
    schema: {
      description: 'Get order by ID',
      tags: ['Orders'],
    },
  }, controller.getOrder.bind(controller));

  // Get order by order number
  app.get('/number/:orderNumber', {
    schema: {
      description: 'Get order by order number',
      tags: ['Orders'],
    },
  }, controller.getOrderByNumber.bind(controller));

  // Get user orders
  app.get('/user/:userId', {
    schema: {
      description: 'Get all orders for a user',
      tags: ['Orders'],
    },
  }, controller.getUserOrders.bind(controller));

  // Update order status
  app.patch('/:id/status', {
    schema: {
      description: 'Update order status',
      tags: ['Orders'],
    },
    preHandler: async (request, reply) => {
      const result = UpdateOrderStatusSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: result.error.errors,
          },
        });
      }
      request.body = result.data;
    },
  }, controller.updateOrderStatus.bind(controller));

  // Cancel order
  app.post('/:id/cancel', {
    schema: {
      description: 'Cancel an order',
      tags: ['Orders'],
    },
  }, controller.cancelOrder.bind(controller));

  // Get valid status transitions
  app.get('/:id/transitions', {
    schema: {
      description: 'Get valid status transitions for an order',
      tags: ['Orders'],
    },
  }, controller.getValidTransitions.bind(controller));
}
