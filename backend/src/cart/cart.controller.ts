import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { CartService } from './cart.service';
import { GetCartSummaryDto } from './dto/cart-summary.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('summary')
  @HttpCode(HttpStatus.OK)
  async getCartSummary(@Body() dto: GetCartSummaryDto) {
    return this.cartService.getCartSummary(dto);
  }
}