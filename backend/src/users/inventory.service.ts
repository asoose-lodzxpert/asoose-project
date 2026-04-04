// File: as/backend/src/users/inventory.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { OrderItemDto } from './dto/users.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  /**
   * Atomic Stock Decrement
   * Performs validation AND update in a single DB statement.
   * Only acts on products where 'manageStock' is true.
   */
  async atomicDecrementStock(
    tx: Prisma.TransactionClient,
    items: OrderItemDto[],
  ) {
    const sortedItems = [...items].sort((a, b) => a.id.localeCompare(b.id));

    for (const item of sortedItems) {
      // 1. Find product to check if we should manage stock
      const product = await tx.product.findUnique({
        where: { id: item.id },
        select: { manageStock: true, stock: true },
      });

      if (!product || !product.manageStock) continue;

      // 2. Perform atomic update with guard
      const result = await tx.product.updateMany({
        where: {
          id: item.id,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (result.count === 0) {
        throw new BadRequestException(
          `Insufficient stock for product ID: ${item.id}`,
        );
      }

      // 3. Auto-update status if it reached 0
      const updatedProduct = await tx.product.findUnique({
        where: { id: item.id },
        select: { stock: true },
      });

      if (updatedProduct && updatedProduct.stock === 0) {
        await tx.product.update({
          where: { id: item.id },
          data: { status: 'OUT_OF_STOCK' },
        });
      }
    }
  }

  /**
   * Atomic Stock Increment (Replenishment)
   * Used when orders are cancelled, rejected, or expire.
   */
  async atomicIncrementStock(
    tx: Prisma.TransactionClient,
    items: any[], // OrderItem objects from DB
  ) {
    const sortedItems = [...items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    );

    for (const item of sortedItems) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { manageStock: true },
      });

      if (!product || !product.manageStock) continue;

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { increment: item.quantity },
          status: 'ACTIVE', // Restore status to ACTIVE if it was OUT_OF_STOCK
        },
      });
    }
  }
}
