import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetCartSummaryDto } from './dto/cart-summary.dto';
import { AddToCartDto } from './dto/add-to-cart.dto';
import type { RedisClientType } from 'redis';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  /**
   * Secure Add to Cart
   * Validates product status/stock and persists to Redis
   */
  async addToCart(userId: string, dto: AddToCartDto) {
    // 1. Validate Product Exists & Status
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        price: true,
        storeId: true,
        status: true,
        stock: true,
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    if (product.status !== 'ACTIVE')
      throw new BadRequestException('Product is not available');
    if (product.stock < dto.quantity)
      throw new BadRequestException('Insufficient stock');

    // 2. Define Redis Key for User Cart
    const cartKey = `cart:${userId}`;

    // 3. Fetch Existing Cart (if any)
    const existingCartRaw = await this.redis.get(cartKey);
    const cart = existingCartRaw ? JSON.parse(existingCartRaw) : { items: [] };

    // 4. Update Logic (Merge or Add)
    const existingItemIndex = cart.items.findIndex(
      (i: any) => i.productId === dto.productId,
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += dto.quantity;
    } else {
      cart.items.push({
        productId: dto.productId,
        quantity: dto.quantity,
        price: product.price, // Snapshot price for security
        storeId: product.storeId,
      });
    }

    // 5. Persist to Redis (TTL 7 days)
    await this.redis.set(cartKey, JSON.stringify(cart), {
      EX: 60 * 60 * 24 * 7,
    });

    return { message: 'Item added to cart', cartSize: cart.items.length };
  }

  /**
   * Calculate Cart Summary / Checkout Breakdown
   */
  async getCartSummary(dto: GetCartSummaryDto) {
    if (!dto.items.length) return { groups: [], total: 0 };

    // 1. Fetch Products & Stores
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { store: true },
    });

    // 2. Group by Store
    const storeGroups = new Map<
      string,
      { store: any; items: any[]; total: number }
    >();

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
      groups,
      grandTotal,
    };
  }
}