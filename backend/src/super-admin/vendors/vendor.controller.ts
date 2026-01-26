import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Patch,
  Req,
} from '@nestjs/common';
import { StoresService } from './vendors.service';
import { CreateVendorDto, VendorQueryDto } from './dto/vendor.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('super-admin/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class VendorsController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAllStores(@Query() query: VendorQueryDto) {
    return this.storesService.findAll(query);
  }

  @Get(':id')
  async getStore(@Param('id') id: string) {
    return this.storesService.findOne(id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createVendor(@Body() dto: CreateVendorDto) {
    return this.storesService.create(dto);
  }

  @Get(':id/performance')
  async getPerformance(@Param('id') id: string, @Query('days') days?: string) {
    return this.storesService.getPerformanceData(id, Number(days) || 30);
  }
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    const adminId = req.user.id || req.user.userId;
    return this.storesService.delete(id, adminId);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any, @Req() req) {
    const adminId = req.user.id || req.user.userId;
    return this.storesService.update(id, dto, adminId);
  }

  @Get(':id/products')
  getProducts(@Param('id') id: string) {
    return this.storesService.getVendorProducts(id);
  }

  @Patch('products/:productId/status')
  async updateProductStatus(
    @Param('productId') productId: string,
    @Body('status') status: 'ACTIVE' | 'DISABLED',
  ) {
    return this.storesService.updateProductStatus(productId, status);
  }

  @Post(':id/message')
  async messageVendor(
    @Param('id') id: string,
    @Body('message') message: string,
  ) {
    return this.storesService.sendMessageToVendor(id, message);
  }
}
