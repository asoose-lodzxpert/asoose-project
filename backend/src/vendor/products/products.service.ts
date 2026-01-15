import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class VendorProductsService {
  private readonly logger = new Logger(VendorProductsService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async getAllCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  /**
   * Ensures the User (Vendor) owns the Store they are trying to act upon.
   */
  private async validateStoreOwnership(userId: string, storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { vendorId: true, name: true, status: true }, // Fixed: ownerId -> vendorId
    });

    if (!store) {
      this.logger.warn(`Store not found: ${storeId}`);
      throw new NotFoundException('Store not found');
    }

    if (store.vendorId !== userId) {
      // Fixed: ownerId -> vendorId
      this.logger.warn(
        `Security Alert: User ${userId} attempted to access store ${storeId} owned by ${store.vendorId}`,
      );
      throw new ForbiddenException('You do not own this store');
    }

    // Optional: Block actions if store is suspended
    if (store.status === 'SUSPENDED' || store.status === 'CLOSED_PERMANENTLY') {
      throw new ForbiddenException(
        `Store is ${store.status}. Actions restricted.`,
      );
    }

    return store;
  }

  /**
   * Ensures the User (Vendor) owns the Product they are trying to edit/delete.
   */
  private async validateProductOwnership(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: { select: { vendorId: true, id: true } } }, // Fixed: ownerId -> vendorId
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Fixed: Check vendorId
    if (product.store.vendorId !== userId) {
      this.logger.warn(
        `Security Alert: User ${userId} tried to access product ${productId} belonging to another vendor.`,
      );
      throw new ForbiddenException('You do not have access to this product');
    }

    return product;
  }

  async findAll(userId: string, storeId: string) {
    await this.validateStoreOwnership(userId, storeId);

    return this.prisma.product.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
      },
    });
  }

  async findOne(userId: string, productId: string) {
    // Uses helper to check ownership immediately
    return this.validateProductOwnership(userId, productId);
  }

  async create(userId: string, dto: CreateProductDto) {
    // 1. Verify Store Ownership
    const store = await this.validateStoreOwnership(userId, dto.storeId);

    // 2. Generate Slug
    let slug = this.generateSlug(dto.name);
    const existingSlug = await this.prisma.product.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // 3. Create
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        price: dto.price,
        image: dto.image,
        stock: dto.stock ?? 0,
        status: ProductStatus.ACTIVE,
        storeId: dto.storeId,
        categoryId: dto.categoryId,
      },
    });

    this.logger.log(
      `Product created: "${product.name}" (ID: ${product.id}) for Store: ${store.name}`,
    );
    return product;
  }

  async update(userId: string, productId: string, dto: UpdateProductDto) {
    // 1. Verify Product Ownership
    const product = await this.validateProductOwnership(userId, productId);

    // 2. Handle Slug Update if name changes
    let newSlug: string | undefined = undefined;

    if (dto.name && dto.name !== product.name) {
      newSlug = this.generateSlug(dto.name);
      const existing = await this.prisma.product.findUnique({
        where: { slug: newSlug },
      });
      if (existing) newSlug = `${newSlug}-${Date.now()}`;
    }

    if (dto.image && product.image && dto.image !== product.image) {
      this.storageService.deleteFile(product.image);
    }

    // 3. Update
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: dto.name,
        slug: newSlug,
        description: dto.description,
        price: dto.price,
        image: dto.image,
        stock: dto.stock,
        categoryId: dto.categoryId,
        status: dto.status,
      },
    });

    this.logger.log(`Product updated: ${productId} by User ${userId}`);
    return updated;
  }

  async remove(userId: string, productId: string) {
    // 1. Verify Product Ownership
    const product = await this.validateProductOwnership(userId, productId);

    // 2. Soft Delete
    const deleted = await this.prisma.product.update({
      where: { id: productId },
      data: {
        status: ProductStatus.DISABLED,
        slug: `${product.slug}-deleted-${Date.now()}`,
      },
    });

    this.logger.log(`Product soft-deleted: ${productId} by User ${userId}`);
    return deleted;
  }

  // --- Utility ---
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
