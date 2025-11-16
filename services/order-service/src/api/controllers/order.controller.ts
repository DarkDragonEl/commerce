/**
 * Order Controller
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { OrderService } from '../../services/order.service';
import { CreateOrderInput, UpdateOrderStatusInput, ListOrdersInput } from '../validators/order.validator';

export class OrderController {
  constructor(private orderService: OrderService) {}

  async createOrder(
    request: FastifyRequest<{ Body: CreateOrderInput }>,
    reply: FastifyReply
  ) {
    const order = await this.orderService.createOrder(request.body);

    return reply.status(201).send({
      success: true,
      data: { order },
    });
  }

  async getOrder(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const order = await this.orderService.getOrder(request.params.id);

    return reply.send({
      success: true,
      data: { order },
    });
  }

  async getOrderByNumber(
    request: FastifyRequest<{ Params: { orderNumber: string } }>,
    reply: FastifyReply
  ) {
    const order = await this.orderService.getOrderByNumber(request.params.orderNumber);

    return reply.send({
      success: true,
      data: { order },
    });
  }

  async listOrders(
    request: FastifyRequest<{ Querystring: ListOrdersInput }>,
    reply: FastifyReply
  ) {
    const result = await this.orderService.listOrders(request.query);

    return reply.send({
      success: true,
      data: {
        orders: result.orders,
        pagination: {
          total: result.total,
          page: request.query.page || 1,
          limit: request.query.limit || 20,
          pages: Math.ceil(result.total / (request.query.limit || 20)),
        },
      },
    });
  }

  async getUserOrders(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    const orders = await this.orderService.getUserOrders(request.params.userId);

    return reply.send({
      success: true,
      data: { orders },
    });
  }

  async updateOrderStatus(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateOrderStatusInput;
    }>,
    reply: FastifyReply
  ) {
    const { status, reason } = request.body;
    const order = await this.orderService.transitionStatus(
      request.params.id,
      status,
      undefined,
      reason
    );

    return reply.send({
      success: true,
      data: { order },
    });
  }

  async cancelOrder(
    request: FastifyRequest<{
      Params: { id: string };
      Body: { reason?: string };
    }>,
    reply: FastifyReply
  ) {
    const order = await this.orderService.cancelOrder(
      request.params.id,
      undefined,
      request.body.reason
    );

    return reply.send({
      success: true,
      data: { order },
    });
  }

  async getValidTransitions(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const transitions = await this.orderService.getValidTransitions(request.params.id);

    return reply.send({
      success: true,
      data: { transitions },
    });
  }
}
