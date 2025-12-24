import { Get, Patch, Param, Body, UnauthorizedException, NotFoundException,Controller, Post, Request, UseGuards,Delete } from '@nestjs/common';

import { CreateStoreDto } from './dto/create-store-dto';
import { VendorService } from './dto/vendor.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateProductDto } from './dto/create-product-dto';
@Controller('vendor')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

@UseGuards(JwtAuthGuard)
@Post('register')
async register(@Request() req, @Body() dto: CreateStoreDto) {
return this.vendorService.registerStore(req.user.id, dto, req.user.email);

}

@Get('orders')
  async getVendorOrders(@Request() req) {
    return this.vendorService.getVendorOrders(req.user.id);
  }

  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Request() req, 
    @Param('id') orderId: string, 
    @Body('status') status: string
  ) {
    return this.vendorService.updateOrderStatus(req.user.id, orderId, status);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(@Request() req) {
    return this.vendorService.getDashboardStats(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('products/:id')
  async updateProduct(
    @Request() req, 
    @Param('id') productId: string, 
    @Body() body: any
  ) {
    return this.vendorService.updateProduct(req.user.id, productId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('products/:id')
  async deleteProduct(@Request() req, @Param('id') productId: string) {
    return this.vendorService.deleteProduct(req.user.id, productId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('categories')
  async getCategories() {
    return this.vendorService.getCategories();
  }

  @UseGuards(JwtAuthGuard)
  @Post('products')
  async createProduct(@Request() req, @Body() dto: CreateProductDto) {
    return this.vendorService.createProduct(req.user.id, dto);
  }
}