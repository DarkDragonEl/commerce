/**
 * Payment Controller
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentService } from '../../services/payment.service';
import { CreatePaymentInput, ConfirmPaymentInput, RefundPaymentInput } from '../validators/payment.validator';

export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  async createPayment(
    request: FastifyRequest<{ Body: CreatePaymentInput }>,
    reply: FastifyReply
  ) {
    const payment = await this.paymentService.createPayment(request.body);

    return reply.status(201).send({
      success: true,
      data: { payment },
    });
  }

  async confirmPayment(
    request: FastifyRequest<{
      Params: { id: string };
      Body: ConfirmPaymentInput;
    }>,
    reply: FastifyReply
  ) {
    const payment = await this.paymentService.confirmPayment(
      request.params.id,
      request.body.paymentMethodId
    );

    return reply.send({
      success: true,
      data: { payment },
    });
  }

  async getPayment(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const payment = await this.paymentService.getPayment(request.params.id);

    return reply.send({
      success: true,
      data: { payment },
    });
  }

  async getPaymentByOrderId(
    request: FastifyRequest<{ Params: { orderId: string } }>,
    reply: FastifyReply
  ) {
    const payment = await this.paymentService.getPaymentByOrderId(request.params.orderId);

    return reply.send({
      success: true,
      data: { payment },
    });
  }

  async getUserPayments(
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply
  ) {
    const payments = await this.paymentService.getUserPayments(request.params.userId);

    return reply.send({
      success: true,
      data: { payments },
    });
  }

  async cancelPayment(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const payment = await this.paymentService.cancelPayment(request.params.id);

    return reply.send({
      success: true,
      data: { payment },
    });
  }

  async refundPayment(
    request: FastifyRequest<{
      Params: { id: string };
      Body: RefundPaymentInput;
    }>,
    reply: FastifyReply
  ) {
    const payment = await this.paymentService.refundPayment(
      request.params.id,
      request.body.amount,
      request.body.reason
    );

    return reply.send({
      success: true,
      data: { payment },
    });
  }
}
