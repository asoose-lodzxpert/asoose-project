import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Adjusted import path if needed, or keep 'src/prisma/...'
import { StorageService } from '../../storage/storage.service'; // Adjusted import path if needed
import { CreateBannerDto, UpdateBannerDto } from './dto/create-banner.dto';

@Injectable()
export class BannersService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  // ===========================================================================
  // READ
  // ===========================================================================

  async findAll() {
    const banners = await this.prisma.banner.findMany({
      orderBy: { priority: 'desc' },
    });

    return Promise.all(
      banners.map(async (banner) => ({
        ...banner,
        image: banner.image ? await this.resolveImage(banner.image) : null,
      })),
    );
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException(`Banner with ID ${id} not found`);

    return {
      ...banner,
      image: banner.image ? await this.resolveImage(banner.image) : null,
    };
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
      if (banner.image) {
        // FIX 1: Changed deleteFileByKey -> deleteFile
        await this.storage.deleteFile(banner.image).catch(console.error);
      }
      const upload = await this.storage.uploadFile(file);
      imageKey = upload.key;
    } else if (data.image !== undefined) {
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
      // FIX 2: Changed deleteFileByKey -> deleteFile
      await this.storage.deleteFile(banner.image).catch(console.error);
    }

    return this.prisma.banner.delete({ where: { id } });
  }

  // Renamed helper to be more accurate (resolveImage instead of getSignedUrl)
  private async resolveImage(key: string): Promise<string> {
    try {
      if (key.startsWith('http')) return key;
      // FIX 3: Changed getSignedUrlForKey -> getPublicUrl
      return this.storage.getPublicUrl(key);
    } catch (e) {
      console.error(`Failed to resolve URL for key ${key}`, e);
      return '';
    }
  }
}