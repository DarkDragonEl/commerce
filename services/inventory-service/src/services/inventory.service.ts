import { InventoryItem, Reservation, ReservationStatus } from '@prisma/client';
import { logger, RabbitMQClient, BadRequestError, NotFoundError, InventoryEventType } from '@ecommerce/shared';
import { prisma } from '../config/database';
import { env } from '../config/env';
import crypto from 'crypto';

export class InventoryService {
  constructor(private rabbitmq?: RabbitMQClient) {}

  async getOrCreateItem(productId: string, productSku: string, initialQuantity: number = 0): Promise<InventoryItem> {
    let item = await prisma.inventoryItem.findUnique({ where: { productId } });

    if (!item) {
      item = await prisma.inventoryItem.create({
        data: {
          productId,
          productSku,
          availableQuantity: initialQuantity,
          totalQuantity: initialQuantity,
          lowStockThreshold: env.LOW_STOCK_THRESHOLD,
        },
      });
      await this.logMovement(item.id, 'initial', initialQuantity, 'Initial stock');
    }

    return item;
  }

  async reserve(productId: string, quantity: number, orderId?: string): Promise<Reservation> {
    const item = await prisma.inventoryItem.findUnique({ where: { productId } });

    if (!item) throw new NotFoundError('Inventory item not found');
    if (item.availableQuantity < quantity) {
      throw new BadRequestError(`Insufficient stock. Available: ${item.availableQuantity}, Requested: ${quantity}`);
    }

    const reservation = await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          availableQuantity: { decrement: quantity },
          reservedQuantity: { increment: quantity },
        },
      });

      const reservation = await tx.reservation.create({
        data: {
          itemId: item.id,
          orderId,
          quantity,
          status: ReservationStatus.PENDING,
          expiresAt: new Date(Date.now() + env.RESERVATION_TIMEOUT),
        },
      });

      await this.logMovement(item.id, 'reserve', quantity, `Reserved for order ${orderId}`, orderId);

      return reservation;
    });

    if (this.rabbitmq) {
      await this.rabbitmq.publish('ecommerce.events', 'inventory.reserved', {
        id: crypto.randomUUID(),
        type: InventoryEventType.RESERVED,
        timestamp: new Date().toISOString(),
        source: 'inventory-service',
        data: {
          reservationId: reservation.id,
          productId: item.productId,
          quantity,
          orderId,
        },
      });
    }

    logger.info('Stock reserved', { productId, quantity, reservationId: reservation.id });
    return reservation;
  }

  async confirmReservation(reservationId: string): Promise<Reservation> {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { item: true } });
    if (!reservation) throw new NotFoundError('Reservation not found');
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestError(`Cannot confirm reservation with status ${reservation.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id: reservation.itemId },
        data: {
          reservedQuantity: { decrement: reservation.quantity },
          totalQuantity: { decrement: reservation.quantity },
        },
      });

      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });

      await this.logMovement(reservation.itemId, 'commit', reservation.quantity, `Confirmed reservation ${reservationId}`);

      return updated;
    });

    logger.info('Reservation confirmed', { reservationId });
    return updated;
  }

  async releaseReservation(reservationId: string): Promise<Reservation> {
    const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { item: true } });
    if (!reservation) throw new NotFoundError('Reservation not found');
    if (reservation.status !== ReservationStatus.PENDING) {
      throw new BadRequestError(`Cannot release reservation with status ${reservation.status}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id: reservation.itemId },
        data: {
          availableQuantity: { increment: reservation.quantity },
          reservedQuantity: { decrement: reservation.quantity },
        },
      });

      const updated = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: ReservationStatus.RELEASED,
          releasedAt: new Date(),
        },
      });

      await this.logMovement(reservation.itemId, 'release', reservation.quantity, `Released reservation ${reservationId}`);

      return updated;
    });

    if (this.rabbitmq) {
      await this.rabbitmq.publish('ecommerce.events', 'inventory.released', {
        id: crypto.randomUUID(),
        type: InventoryEventType.RELEASED,
        timestamp: new Date().toISOString(),
        source: 'inventory-service',
        data: {
          reservationId,
          productId: reservation.item.productId,
          quantity: reservation.quantity,
        },
      });
    }

    logger.info('Reservation released', { reservationId });
    return updated;
  }

  async adjustStock(productId: string, quantity: number, reason: string): Promise<InventoryItem> {
    const item = await prisma.inventoryItem.findUnique({ where: { productId } });
    if (!item) throw new NotFoundError('Inventory item not found');

    const updated = await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        availableQuantity: { increment: quantity },
        totalQuantity: { increment: quantity },
      },
    });

    await this.logMovement(item.id, quantity > 0 ? 'restock' : 'adjustment', Math.abs(quantity), reason);

    logger.info('Stock adjusted', { productId, quantity, reason });
    return updated;
  }

  async getInventory(productId: string): Promise<InventoryItem | null> {
    return await prisma.inventoryItem.findUnique({
      where: { productId },
      include: {
        reservations: {
          where: { status: ReservationStatus.PENDING },
        },
      },
    });
  }

  async checkLowStock(): Promise<InventoryItem[]> {
    const items = await prisma.inventoryItem.findMany({
      where: {
        availableQuantity: { lte: prisma.inventoryItem.fields.lowStockThreshold },
      },
    });

    for (const item of items) {
      if (this.rabbitmq) {
        await this.rabbitmq.publish('ecommerce.events', 'inventory.low_stock', {
          id: crypto.randomUUID(),
          type: InventoryEventType.LOW_STOCK,
          timestamp: new Date().toISOString(),
          source: 'inventory-service',
          data: {
            productId: item.productId,
            sku: item.productSku,
            currentStock: item.availableQuantity,
            threshold: item.lowStockThreshold,
          },
        });
      }
    }

    return items;
  }

  private async logMovement(itemId: string, type: string, quantity: number, reason?: string, reference?: string): Promise<void> {
    await prisma.stockMovement.create({
      data: {
        itemId,
        type,
        quantity,
        reason,
        reference,
      },
    });
  }
}
