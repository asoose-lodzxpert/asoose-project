import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailProducer } from '../mail/email.producer';
import { SupportInquiryDto } from './dto/support-inquiry.dto';

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProducer: EmailProducer,
  ) {}

  async submitInquiry(dto: SupportInquiryDto) {
    const inquiry = await this.prisma.inquiry.create({
      data: {
        name: dto.name,
        email: dto.email.toLowerCase().trim(),
        subject: dto.subject,
        message: dto.message,
      },
    });

    // Notify admin
    this.emailProducer
      .sendAdminNewInquiry(
        'solomonpaul232@gmail.com',
        dto.name,
        dto.email,
        dto.subject,
        dto.message,
      )
      .catch((err: any) =>
        this.logger.warn(`Admin inquiry notification failed: ${err.message}`),
      );

    // Confirm receipt to the sender
    this.emailProducer
      .sendInquiryConfirmation(dto.email, dto.name, dto.subject)
      .catch((err: any) =>
        this.logger.warn(`Inquiry confirmation email failed: ${err.message}`),
      );

    return { success: true, id: inquiry.id };
  }
}
