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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoresService } from './vendors.service';
import {
  CreateVendorDto,
  ManualOnboardVendorDto,
  VendorQueryDto,
} from './dto/vendor.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller({
  path: 'super-admin/vendors',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class VendorsController {
  constructor(private readonly storesService: StoresService) {}

  /** GET /api/v1/super-admin/vendors/categories
   *  Returns all product categories. Accessible to SUPER_ADMIN and ADMIN.
   *  Must be declared BEFORE `:id` routes to avoid route collision.
   */
  @Get('categories')
  async getCategories() {
    return this.storesService.getAllCategories();
  }

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

  /**
   * Manually onboards a vendor directly as ACTIVE + VERIFIED.
   * Bypasses the normal PENDING review flow. SUPER_ADMIN only.
   */
  @Post('onboard')
  @Roles(UserRole.SUPER_ADMIN)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async manualOnboard(@Body() dto: ManualOnboardVendorDto, @Req() req) {
    const adminId = req.user.id || req.user.userId;
    return this.storesService.manualOnboard(dto, adminId);
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

  /**
   * Admin adds a product to a specific vendor's store.
   * Accepts multipart/form-data with an optional image file.
   */
  @Post(':id/products')
  @UseInterceptors(FileInterceptor('image'))
  async adminCreateProduct(
    @Param('id') storeId: string,
    @Body() body: any,
    @Req() req,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const adminId = req.user.id || req.user.userId;
    return this.storesService.adminCreateProduct(
      storeId,
      {
        name: body.name,
        description: body.description,
        price: Number(body.price),
        stock: body.stock != null ? Number(body.stock) : 0,
        categoryId: body.categoryId,
      },
      adminId,
      file,
    );
  }

  @Get(':id/documents')
  getDocuments(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storesService.getVendorDocuments(
      id,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Get(':id/payouts')
  getPayouts(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storesService.getVendorPayouts(
      id,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Get(':id/activity')
  getActivity(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storesService.getVendorActivity(
      id,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  @Get(':id/reviews')
  getReviews(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.storesService.getVendorReviews(
      id,
      Number(page) || 1,
      Number(limit) || 10,
    );
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
