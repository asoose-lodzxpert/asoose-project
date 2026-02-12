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
   * Prevents race conditions where two requests read available stock simultaneously.
   */
  async atomicDecrementStock(
    tx: Prisma.TransactionClient,
    items: OrderItemDto[],
  ) {
    // Sort items by ID to prevent Deadlocks during concurrent access
    const sortedItems = [...items].sort((a, b) => a.id.localeCompare(b.id));

    for (const item of sortedItems) {
      // Prisma updateMany allows filtering on non-unique fields (like stock level)
      // This acts as a conditional update: "Decrement ONLY IF stock >= requested"
      const result = await tx.product.updateMany({
        where: {
          id: item.id,
          stock: { gte: item.quantity }, // THE GUARD
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (result.count === 0) {
        // If count is 0, it means either Product ID didn't exist OR Stock was insufficient
        // We treat this as a hard failure and rollback the transaction
        this.logger.warn(
          `Stock contention or insufficiency for Product: ${item.id}`,
        );
        throw new BadRequestException(
          `Insufficient stock for product ID: ${item.id}. Transaction rolled back.`,
        );
      }
    }

    this.logger.debug(`Successfully reserved stock for ${items.length} items`);
  }
}
