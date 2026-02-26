import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EmailProducer } from '../mail/email.producer';
import { SupportInquiryDto } from './dto/support-inquiry.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Support')
@Controller({
  path: 'support',
  version: '1',
})
export class SupportController {
  constructor(private readonly emailProducer: EmailProducer) {}

  @ApiOperation({ summary: 'Submit a support inquiry (sends email to admin)' })
  @Post('inquiry')
  @Throttle({ default: { limit: 2, ttl: 60 * 60_000 } }) // 2 submissions/hour per IP
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
