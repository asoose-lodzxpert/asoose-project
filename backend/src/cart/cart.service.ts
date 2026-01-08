import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetCartSummaryDto, CartItemDto } from './dto/cart-summary.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCartSummary(dto: GetCartSummaryDto) {
    if (!dto.items.length) {
      return { items: [], total: 0, restaurant: null };
    }

    // 1. Fetch all products involved in the cart
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        store: true,
      },
    });

    if (products.length === 0) {
        throw new BadRequestException('Invalid products in cart');
    }

    // 2. Validate Restaurant Consistency (All items should be from the same store)
    const storeId = products[0].storeId;
    const isDifferentStore = products.some(p => p.storeId !== storeId);
    if (isDifferentStore) {
        throw new BadRequestException('Cart contains items from multiple restaurants. Please clear and start over.');
    }

    const store = products[0].store;

    // 3. Calculate Totals & Build Response
    let subtotal = 0;
    
    const validatedItems = await Promise.all(dto.items.map(async (itemDto) => {
        const product = products.find(p => p.id === itemDto.productId);
        if (!product) return null; // Should be handled by initial check, but safety first

        let itemPrice = product.price;

        // Note: If you implement modifiers later, fetch and add their prices here
        // const modifierPrice = ...

        const lineTotal = itemPrice * itemDto.quantity;
        subtotal += lineTotal;

        return {
            id: product.id,
            name: product.name,
            image: product.image,
            description: product.slug, // Or fetch a short description if you add that column
            price: itemPrice,
            quantity: itemDto.quantity,
            total: lineTotal,
            available: product.status === 'ACTIVE'
        };
    }));

    // Filter out nulls if any products weren't found
    const finalItems = validatedItems.filter(i => i !== null);

    // 4. Return formatted data matching your Cart Page needs
    return {
        restaurant: {
            id: store.id,
            name: store.name,
            image: store.image,
            // Format time range based on prepTime (e.g., "20-35 min")
            time: `${store.prepTime || 20}-${(store.prepTime || 20) + 15} min`, 
            currency: '₦' // Or dynamic based on region
        },
        items: finalItems,
        subtotal: subtotal,
        // Example delivery fee logic (can be made complex later)
        deliveryFee: 500, 
        total: subtotal + 500
    };
  }
}