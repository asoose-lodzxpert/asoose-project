import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SupportService } from './support.service';
import { SupportInquiryDto } from './dto/support-inquiry.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Support')
@Controller({
  path: 'support',
  version: '1',
})
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @ApiOperation({ summary: 'Submit a support inquiry (saved + emails admin)' })
  @Post('inquiry')
  @Throttle({ default: { limit: 2, ttl: 60 * 60_000 } }) // 2 submissions/hour per IP
  async handleInquiry(@Body() dto: SupportInquiryDto) {
    return this.supportService.submitInquiry(dto);
  }
}
