import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AppLogger } from 'src/libs/logger/app-logger.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StorageService } from 'src/storage/storage.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/create-banner.dto';

@Injectable()
export class BannersService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private readonly appLogger: AppLogger,
  ) {}

  // ===========================================================================
  // READ
  // ===========================================================================

  async findAll() {
    const banners = await this.prisma.banner.findMany({
      orderBy: { priority: 'desc' },
    });

    return banners;
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Banner with ID ${id} not found`);

    return banner;
  }

  // ===========================================================================
  // WRITE (Create / Update)
  // ===========================================================================
  async create(data: CreateBannerDto, file?: Express.Multer.File) {
    let imageKey: string | null = null;

    if (file) {
      const upload = await this.storage.uploadFile(file);
      imageKey = upload.key;
    } else if (data.image) {
      // Persist the pre-uploaded URL/Key if no file is present
      imageKey = data.image;
    } else {
      // ✅ FIX: Mandatory image validation
      throw new BadRequestException('Banner image is required');
    }

    return this.prisma.banner.create({
      data: {
        title: data.title,
        subtitle: data.subtitle,
        buttonText: data.buttonText ?? 'Order Now',
        link: data.link ?? '/store',
        type: data.type ?? 'PROMO',
        priority: data.priority ? Number(data.priority) : 0,
        isActive: data.isActive ?? true,
        image: imageKey,
      },
    });
  }

  async update(id: string, data: UpdateBannerDto, file?: Express.Multer.File) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Banner not found`);

    let imageKey = banner.image;

    if (file) {
      // Case A: New File Uploaded -> Delete old, upload new
      if (banner.image) {
        await this.storage.deleteFile(banner.image).catch((error) => {
          this.appLogger.error('Failed to delete old banner image', error?.stack, { error });
        });
      }
      const upload = await this.storage.uploadFile(file);
      imageKey = upload.key;
    } else if (data.image !== undefined) {
      // Case B: JSON Update (Frontend Flow)
      // ✅ FIX: If the image URL string has changed, delete the old image
      if (banner.image && banner.image !== data.image) {
        await this.storage.deleteFile(banner.image).catch((error) => {
          this.appLogger.error('Failed to delete replaced banner image', error?.stack, { error });
        });
      }
      imageKey = data.image;
    }

    return this.prisma.banner.update({
      where: { id },
      data: {
        title: data.title,
        subtitle: data.subtitle,
        buttonText: data.buttonText,
        link: data.link,
        type: data.type,
        isActive: data.isActive,
        priority: data.priority ? Number(data.priority) : undefined,
        image: imageKey,
      },
    });
  }

  // ===========================================================================
  // REORDERING & DELETE
  // ===========================================================================

  async reorder(ids: string[]) {
    return this.prisma.$transaction(
      ids.map((id, index) => {
        // First item = Highest Priority
        const priority = ids.length - index;
        return this.prisma.banner.update({
          where: { id },
          data: { priority },
        });
      }),
    );
  }

  async remove(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Banner not found`);

    if (banner.image) {
      await this.storage.deleteFile(banner.image).catch((error) => {
        this.appLogger.error('Failed to delete banner image', error?.stack, {
          error,
        });
      });
    }

    return this.prisma.banner.delete({ where: { id } });
  }
}