import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Product } from '@prisma/client';
import { OrderItemDto } from './dto/users.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  /**
   * Checks if there is enough stock for all items.
   * Throws BadRequestException if any item is insufficient.
   */
  validateStock(items: OrderItemDto[], productMap: Map<string, Product>) {
    const errors: string[] = [];

    for (const item of items) {
      const product = productMap.get(item.id);

      // Assuming your Product model has a 'stock' or 'quantity' field
      // Adjust 'stock' to match your actual database column name
      if (product && product.stock < item.quantity) {
        errors.push(
          `Insufficient stock for ${product.name}. Requested: ${item.quantity}, Available: ${product.stock}`,
        );
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('; '));
    }
  }

  /**
   * Decrements stock for ordered items atomically within the transaction.
   */
  async decrementStock(tx: Prisma.TransactionClient, items: OrderItemDto[]) {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.id },
        data: {
          stock: { decrement: item.quantity },
        },
      });
    }
    this.logger.log(`Decremented stock for ${items.length} items`);
  }
}
