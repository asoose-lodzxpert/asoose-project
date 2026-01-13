import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/create-banner.dto';
@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.banner.findMany({
      orderBy: { priority: 'desc' },
    });
  }

  async create(data: CreateBannerDto) {
    return this.prisma.banner.create({
      data: {
        title: data.title,
        subtitle: data.subtitle,
        buttonText: data.buttonText,
        link: data.link,
        image: data.image,
        type: data.type,
        priority: data.priority,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, data: UpdateBannerDto) {
    try {
      return await this.prisma.banner.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.subtitle && { subtitle: data.subtitle }),
          ...(data.buttonText && { buttonText: data.buttonText }),
          ...(data.link && { link: data.link }),
          ...(data.image && { image: data.image }),
          ...(data.type && { type: data.type }),
          ...(data.priority !== undefined && { priority: data.priority }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Banner with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.banner.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Banner with ID ${id} not found`);
      }
      throw error;
    }
  }

  async findOne(id: string) {
    const banner = await this.prisma.banner.findUnique({ where: { id } });

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    return banner;
  }
}
