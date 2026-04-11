import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Logger,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL, CacheKey } from '@nestjs/cache-manager';
import { VendorProductsService } from './products.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ADMIN_ROLES } from '../../auth/decorators/admin-roles.constant';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Vendor / Products')
@ApiBearerAuth()
@Controller({
  path: 'vendor/products',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR, ...ADMIN_ROLES)
export class VendorProductsController {
  private readonly logger = new Logger(VendorProductsController.name);

  constructor(private readonly productsService: VendorProductsService) {}

  // 1. GET CATEGORIES (Placed FIRST to avoid ID collision)
  @ApiOperation({ summary: 'Get all product categories' })
  @Get('categories')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes (categories don't change often)
  async getCategories() {
    return this.productsService.getAllCategories();
  }

  // 2. GET ALL PRODUCTS
  @ApiOperation({
    summary: 'Get all products for a store (requires storeId query param)',
  })
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // Cache for 1 minute
  async findAll(@Request() req, @Query('storeId') storeId: string) {
    const userId = req.user.id;

    if (!storeId) {
      throw new Error('storeId query parameter is required');
    }

    return this.productsService.findAll(userId, storeId);
  }

  // 3. GET ONE PRODUCT
  @ApiOperation({ summary: 'Get a single product by ID' })
  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120) // Cache for 2 minutes
  async findOne(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.productsService.findOne(userId, id);
  }

  // 4. CREATE
  @ApiOperation({ summary: 'Create a new product' })
  @Post()
  async create(@Request() req, @Body() createProductDto: CreateProductDto) {
    const userId = req.user.id;
    return this.productsService.create(userId, createProductDto);
  }

  // 5. UPDATE
  @ApiOperation({ summary: 'Update a product by ID' })
  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const userId = req.user.id;
    return this.productsService.update(userId, id, updateProductDto);
  }

  // 6. DELETE
  @ApiOperation({ summary: 'Delete a product by ID' })
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.productsService.remove(userId, id);
  }
}
