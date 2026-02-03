import { Controller, Post, Body } from '@nestjs/common';
import { EmailProducer } from '../mail/email.producer';
import { SupportInquiryDto } from './dto/support-inquiry.dto';

@Controller('support')
export class SupportController {
  constructor(private readonly emailProducer: EmailProducer) {}

  @Post('inquiry')
  async handleInquiry(@Body() dto: SupportInquiryDto) {
    // We reuse the existing vendor message logic to notify admin
    await this.emailProducer.sendVendorMessage(
      'solomonpaul232@gmail.com',
      `[Support] ${dto.subject}`,
      `Sender: ${dto.name} (${dto.email})\n\nMessage:\n${dto.message}`,
    );
    return { success: true };
  }
}
