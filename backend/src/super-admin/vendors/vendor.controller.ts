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
  UploadedFiles,
} from '@nestjs/common';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { StoresService } from './vendors.service';
import {
  AdminCreateVendorDto,
  ManualOnboardVendorDto,
  VendorQueryDto,
} from './dto/vendor.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
} from '@nestjs/swagger';

@ApiTags('Super-Admin / Vendors')
@ApiBearerAuth()
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
  @ApiOperation({ summary: 'Get all product categories' })
  @Get('categories')
  async getCategories() {
    return this.storesService.getAllCategories();
  }

  @ApiOperation({ summary: 'List all vendors/stores with filters' })
  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAllStores(@Query() query: VendorQueryDto) {
    return this.storesService.findAll(query);
  }

  @ApiOperation({ summary: 'Get vendor store statistics' })
  @Get('stats')
  async getStats() {
    return this.storesService.getStats();
  }

  @ApiOperation({ summary: 'Get vendor/store details by ID' })
  @Get(':id')
  async getStore(@Param('id') id: string) {
    return this.storesService.findOne(id);
  }

  @ApiOperation({ summary: 'Create a new vendor account' })
  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createVendor(@Body() dto: AdminCreateVendorDto) {
    return this.storesService.create(dto);
  }

  /**
   * Manually onboards a vendor directly as ACTIVE + VERIFIED.
   * Bypasses the normal PENDING review flow. SUPER_ADMIN only.
   */
  @ApiOperation({
    summary:
      'Manually onboard a vendor as ACTIVE+VERIFIED (bypasses review flow)',
  })
  @Post('onboard')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  async manualOnboard(
    @Body() dto: ManualOnboardVendorDto,
    @Req() req,
    @UploadedFiles()
    files?: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    const adminId = req.user.id || req.user.userId;
    return this.storesService.manualOnboard(dto, adminId, {
      logo: files?.logo?.[0],
      banner: files?.banner?.[0],
    });
  }

  @ApiOperation({ summary: 'Get vendor performance metrics for N days' })
  @Get(':id/performance')
  async getPerformance(@Param('id') id: string, @Query('days') days?: string) {
    return this.storesService.getPerformanceData(id, Number(days) || 30);
  }
  @ApiOperation({ summary: 'Delete a vendor account' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    const adminId = req.user.id || req.user.userId;
    return this.storesService.delete(id, adminId);
  }

  @ApiOperation({
    summary: 'Update vendor/store details (incl. logo & banner images)',
  })
  @ApiConsumes('multipart/form-data')
  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req,
    @UploadedFiles()
    files?: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    const adminId = req.user.id || req.user.userId;
    return this.storesService.update(id, body, adminId, {
      logo: files?.logo?.[0],
      banner: files?.banner?.[0],
    });
  }

  @ApiOperation({ summary: "List a vendor's products" })
  @Get(':id/products')
  getProducts(@Param('id') id: string) {
    return this.storesService.getVendorProducts(id);
  }

  /**
   * Admin adds a product to a specific vendor's store.
   * Accepts multipart/form-data with an optional image file.
   */
  @ApiOperation({ summary: 'Admin: add a product to a vendor store' })
  @ApiConsumes('multipart/form-data')
  @Post(':id/products')
  @UseInterceptors(FileInterceptor('image'))
  async adminCreateProduct(
    @Param('id') storeId: string,
    @Body() body: any,
    @Req() req,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const adminId = req.user.id || req.user.userId;

    // Parse modifier groups from JSON string (sent via multipart/form-data)
    let modifierGroups: any[] | undefined;
    if (body.modifierGroups) {
      try {
        modifierGroups =
          typeof body.modifierGroups === 'string'
            ? JSON.parse(body.modifierGroups)
            : body.modifierGroups;
      } catch {
        modifierGroups = undefined;
      }
    }

    return this.storesService.adminCreateProduct(
      storeId,
      {
        name: body.name,
        description: body.description,
        price: Number(body.price),
        stock: body.stock != null ? Number(body.stock) : 0,
        categoryId: body.categoryId,
        modifierGroups,
      },
      adminId,
      file,
    );
  }

  @ApiOperation({ summary: "List a vendor's submitted documents" })
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

  @ApiOperation({ summary: "List a vendor's payout records" })
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

  @ApiOperation({ summary: "Get a vendor's activity log" })
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

  @ApiOperation({ summary: "Get a vendor's customer reviews" })
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

  @ApiOperation({ summary: 'Enable or disable a vendor product' })
  @Patch('products/:productId/status')
  async updateProductStatus(
    @Param('productId') productId: string,
    @Body('status') status: 'ACTIVE' | 'DISABLED',
  ) {
    return this.storesService.updateProductStatus(productId, status);
  }

  @ApiOperation({ summary: 'Send a direct message to a vendor' })
  @Post(':id/message')
  async messageVendor(
    @Param('id') id: string,
    @Body('message') message: string,
  ) {
    return this.storesService.sendMessageToVendor(id, message);
  }

  @ApiOperation({ summary: 'Toggle admin-managed mode for a store' })
  @Patch(':id/admin-managed')
  async toggleAdminManaged(
    @Param('id') id: string,
    @Body('isAdminManaged') isAdminManaged: boolean,
    @Req() req: any,
  ) {
    const adminId = req.user.id || req.user.userId;
    return this.storesService.setAdminManaged(id, isAdminManaged, adminId);
  }
}
