import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetCartSummaryDto, CartItemDto } from './dto/cart-summary.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

// Replace the existing getCartSummary method
async getCartSummary(dto: GetCartSummaryDto) {
  if (!dto.items.length) return { groups: [], total: 0 };

  // 1. Fetch Products & Stores
  const productIds = dto.items.map((i) => i.productId);
  const products = await this.prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { store: true },
  });

  // 2. Group by Store
  const storeGroups = new Map<string, { store: any; items: any[]; total: number }>();

  for (const itemDto of dto.items) {
    const product = products.find((p) => p.id === itemDto.productId);
    if (!product) continue;

    if (!storeGroups.has(product.storeId)) {
      storeGroups.set(product.storeId, {
        store: product.store,
        items: [],
        total: 0,
      });
    }

    const group = storeGroups.get(product.storeId)!;
    const lineTotal = product.price * itemDto.quantity;
    
    group.items.push({
      ...product, // map fields as needed
      quantity: itemDto.quantity,
      lineTotal,
    });
    group.total += lineTotal;
  }

  // 3. Build Response
  const groups = Array.from(storeGroups.values()).map((g) => ({
    restaurant: {
      id: g.store.id,
      name: g.store.name,
      image: g.store.logo,
    },
    items: g.items,
    subtotal: g.total,
    deliveryFee: 500, // TODO: Call pricing service per store location
    total: g.total + 500,
  }));

  const grandTotal = groups.reduce((acc, g) => acc + g.total, 0);

  return {
    groups, // Frontend must update to iterate this array
    grandTotal,
  };
}
}
