import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetCartSummaryDto } from './dto/cart-summary.dto';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { PricingService } from '../users/pricing.service';
import type { RedisClientType } from 'redis';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
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
        modifierGroups: {
          include: {
            modifiers: { select: { id: true, price: true } },
          },
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    if (product.status !== 'ACTIVE')
      throw new BadRequestException('Product is not available');
    if (product.stock < dto.quantity)
      throw new BadRequestException('Insufficient stock');

    // 2. Validate & price modifiers from the DB (never trust client pricing)
    const selectedModifierIds = dto.modifierIds ?? [];
    let modifierPriceAddon = 0;

    for (const group of product.modifierGroups) {
      const selectedInGroup = group.modifiers.filter((m) =>
        selectedModifierIds.includes(m.id),
      );

      // Enforce minSelect (required groups)
      if (selectedInGroup.length < group.minSelect) {
        throw new BadRequestException(
          `Modifier group "${group.name}" requires at least ${group.minSelect} selection(s)`,
        );
      }

      // Enforce maxSelect
      if (selectedInGroup.length > group.maxSelect) {
        throw new BadRequestException(
          `Modifier group "${group.name}" allows at most ${group.maxSelect} selection(s)`,
        );
      }

      // Accumulate modifier prices from DB — client price is never used
      modifierPriceAddon += selectedInGroup.reduce(
        (sum, m) => sum + m.price,
        0,
      );
    }

    // Validate that every supplied modifierId actually belongs to this product
    const allProductModifierIds = product.modifierGroups.flatMap((g) =>
      g.modifiers.map((m) => m.id),
    );
    const invalidIds = selectedModifierIds.filter(
      (id) => !allProductModifierIds.includes(id),
    );
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid modifier IDs for this product: ${invalidIds.join(', ')}`,
      );
    }

    // 3. DB-authoritative unit price (base + modifiers)
    const unitPrice = product.price + modifierPriceAddon;

    // 4. Define Redis Key for User Cart
    const cartKey = `cart:${userId}`;

    // 5. Fetch Existing Cart (if any)
    const existingCartRaw = await this.redis.get(cartKey);
    const cart = existingCartRaw ? JSON.parse(existingCartRaw) : { items: [] };

    // 6. Update Logic — treat the same product with different modifiers as distinct items
    const modifierKey = selectedModifierIds.slice().sort().join(',');
    const existingItemIndex = cart.items.findIndex(
      (i: any) =>
        i.productId === dto.productId &&
        (i.modifierIds ?? []).slice().sort().join(',') === modifierKey,
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += dto.quantity;
    } else {
      cart.items.push({
        productId: dto.productId,
        quantity: dto.quantity,
        price: unitPrice, // DB-authoritative: base + modifier add-ons
        storeId: product.storeId,
        modifierIds: selectedModifierIds,
      });
    }

    // 7. Persist to Redis (TTL 7 days)
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
    const groups = Array.from(storeGroups.values()).map((g) => {
      // Estimate delivery fee using the pricing service minimum. The cart summary
      // is a preview — no delivery address is known yet, so distance = 0 yields
      // the floor (MIN_FEE). The checkout page fetches an exact quote via
      // POST /users/cart/quote once the user selects an address.
      const deliveryFee = this.pricingService.calculateDeliveryFee(0);
      return {
        restaurant: {
          id: g.store.id,
          name: g.store.name,
          image: g.store.logo,
        },
        items: g.items,
        subtotal: g.total,
        deliveryFee,
        total: g.total + deliveryFee,
      };
    });

    const grandTotal = groups.reduce((acc, g) => acc + g.total, 0);

    return {
      groups,
      grandTotal,
    };
  }
}
