/**
 * Payment request validators
 */

import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const CreatePaymentSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  userEmail: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  paymentMethodId: z.string().optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

export const ConfirmPaymentSchema = z.object({
  paymentMethodId: z.string().optional(),
});

export type ConfirmPaymentInput = z.infer<typeof ConfirmPaymentSchema>;

export const RefundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
});

export type RefundPaymentInput = z.infer<typeof RefundPaymentSchema>;
