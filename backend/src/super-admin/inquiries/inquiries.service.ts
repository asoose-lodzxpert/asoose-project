import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailProducer } from 'src/mail/email.producer';
import { ReplyInquiryDto } from './dto/reply-inquiry.dto';

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProducer: EmailProducer,
  ) {}

  async findAll(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { replies: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.inquiry.count({ where }),
      this.prisma.inquiry.count({ where: { status: 'UNREAD' } }),
    ]);

    return {
      items,
      total,
      unreadCount,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount() {
    const count = await this.prisma.inquiry.count({
      where: { status: 'UNREAD' },
    });
    return { count };
  }

  async findOne(id: string) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
    });
    if (!inquiry) throw new NotFoundException('Inquiry not found');

    // Auto-mark as READ when viewed
    if (inquiry.status === 'UNREAD') {
      await this.prisma.inquiry.update({
        where: { id },
        data: { status: 'READ' },
      });
    }
    return inquiry;
  }

  async markRead(id: string) {
    const inquiry = await this.prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');

    return this.prisma.inquiry.update({
      where: { id },
      data: { status: 'READ' },
    });
  }

  async reply(id: string, dto: ReplyInquiryDto, adminName: string) {
    const inquiry = await this.prisma.inquiry.findUnique({ where: { id } });
    if (!inquiry) throw new NotFoundException('Inquiry not found');

    const [updatedInquiry] = await this.prisma.$transaction([
      this.prisma.inquiry.update({
        where: { id },
        data: { status: 'REPLIED' },
        include: { replies: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.inquiryReply.create({
        data: {
          inquiryId: id,
          adminName,
          message: dto.message,
        },
      }),
    ]);

    // Send reply email to the enquirer
    this.emailProducer
      .sendInquiryReply(inquiry.email, inquiry.name, inquiry.subject, dto.message)
      .catch((err: any) =>
        this.logger.warn(`Inquiry reply email failed: ${err.message}`),
      );

    return updatedInquiry;
  }
}
