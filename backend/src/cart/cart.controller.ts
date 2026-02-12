import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { GetCartSummaryDto } from './dto/cart-summary.dto';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';

@Controller({
  path: 'cart',
  version: '1',
})
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Secure Endpoint: Add Item to Cart
   * Requires JWT Authentication
   */
  @Post('add')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async addToCart(
    @Body() dto: AddToCartDto,
    @Req() req: Request & { user?: { userId: string; id?: string } },
  ) {
    // Extract userId from the validated JWT token
    const userId = req.user?.userId || req.user?.id;

    if (!userId) {
      throw new Error('User ID not found in session');
    }

    return this.cartService.addToCart(userId, dto);
  }

  /**
   * Public/Shared Endpoint: Calculate Cart Summary
   * Used for displaying totals and fees (stateless calculation)
   */
  @Post('summary')
  @HttpCode(HttpStatus.OK)
  async getCartSummary(@Body() dto: GetCartSummaryDto) {
    return this.cartService.getCartSummary(dto);
  }
}