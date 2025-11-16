/**
 * Cart Repository
 */

import { Cart, CartItem, Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export type CartWithItems = Cart & { items: CartItem[] };

export class CartRepository {
  async findByUserId(userId: string): Promise<CartWithItems | null> {
    return await prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
  }

  async findBySessionId(sessionId: string): Promise<CartWithItems | null> {
    return await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });
  }

  async create(data: Prisma.CartCreateInput): Promise<CartWithItems> {
    return await prisma.cart.create({
      data,
      include: { items: true },
    });
  }

  async addItem(
    cartId: string,
    productId: string,
    productSku: string,
    quantity: number,
    unitPrice: number,
    variantId?: string
  ): Promise<CartItem> {
    // Check if item exists
    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_productId_variantId: {
          cartId,
          productId,
          variantId: variantId || '',
        },
      },
    });

    if (existing) {
      return await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
          unitPrice,
        },
      });
    }

    return await prisma.cartItem.create({
      data: {
        cartId,
        productId,
        productSku,
        variantId,
        quantity,
        unitPrice,
      },
    });
  }

  async updateItemQuantity(itemId: string, quantity: number): Promise<CartItem> {
    return await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  async removeItem(itemId: string): Promise<CartItem> {
    return await prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  async clear(cartId: string): Promise<void> {
    await prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }

  async delete(cartId: string): Promise<Cart> {
    return await prisma.cart.delete({
      where: { id: cartId },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await prisma.cart.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }
}
