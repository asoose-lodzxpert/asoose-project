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
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';

@Controller('vendor/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorProductsController {
  private readonly logger = new Logger(VendorProductsController.name);

  constructor(private readonly productsService: VendorProductsService) {}

  // 1. GET CATEGORIES (Placed FIRST to avoid ID collision)
  @Get('categories')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes (categories don't change often)
  async getCategories() {
    return this.productsService.getAllCategories();
  }

  // 2. GET ALL PRODUCTS
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
  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120) // Cache for 2 minutes
  async findOne(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.productsService.findOne(userId, id);
  }

  // 4. CREATE
  @Post()
  async create(@Request() req, @Body() createProductDto: CreateProductDto) {
    const userId = req.user.id;
    return this.productsService.create(userId, createProductDto);
  }

  // 5. UPDATE
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
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.productsService.remove(userId, id);
  }
}
