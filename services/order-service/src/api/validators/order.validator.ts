/**
 * Order request validators
 */

import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

const AddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(2).max(2), // ISO country code
  phone: z.string().optional(),
});

const OrderItemSchema = z.object({
  productId: z.string().uuid(),
  productSku: z.string().min(1),
  productName: z.string().min(1),
  variantId: z.string().uuid().optional(),
  variantName: z.string().optional(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

export const CreateOrderSchema = z.object({
  userId: z.string().uuid(),
  userEmail: z.string().email(),
  items: z.array(OrderItemSchema).min(1),
  shippingAddress: AddressSchema,
  billingAddress: AddressSchema.optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerNotes: z.string().max(1000).optional(),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  reason: z.string().max(500).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof UpdateOrderStatusSchema>;

export const ListOrdersSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  userId: z.string().uuid().optional(),
});

export type ListOrdersInput = z.infer<typeof ListOrdersSchema>;
