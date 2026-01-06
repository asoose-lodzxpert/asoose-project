import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async getVendorReviews(storeId: string, page = 1, limit = 10) {
    const reviews = await this.prisma.review.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        user: { 
          select: { name: true } 
        }
      }
    });

    const total = await this.prisma.review.count({
      where: { storeId },
    });

    return {
      data: reviews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
  }
}