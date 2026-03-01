import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ResendService } from '../mail/resend.service';
import { EmailProducer } from '../mail/email.producer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

const TEST_EMAIL = 'arhyelphilip024@gmail.com';

/** ⚠️  This controller is for testing/staging only.
 *  It is gated by SUPER_ADMIN and must NEVER be registered in production.
 *  Registration is conditional on NODE_ENV !== 'production' (see trips.module.ts).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller({
  path: 'test',
  version: '1',
})
export class TestController {
  constructor(
    private readonly resendService: ResendService,
    private readonly emailProducer: EmailProducer,
  ) {}

  /**
   * POST /api/v1/test/email/direct
   * Sends an email directly (no queue) via Resend so any API error is
   * returned immediately in the HTTP response — great for diagnosing issues.
   */
  @Post('email/direct')
  @HttpCode(HttpStatus.OK)
  async testEmailDirect() {
    const start = Date.now();
    await this.resendService.sendMail({
      to: TEST_EMAIL,
      subject: `[Asoose] Direct email test — ${new Date().toISOString()}`,
      text: 'This email was sent directly via Resend (no queue) from the test endpoint.',
    });
    return {
      success: true,
      to: TEST_EMAIL,
      method: 'direct-resend',
      durationMs: Date.now() - start,
    };
  }

  /**
   * POST /api/v1/test/email/queue
   * Enqueues a welcome email via BullMQ — tests the full queue → worker → SMTP pipeline.
   */
  @Post('email/queue')
  @HttpCode(HttpStatus.OK)
  async testEmailQueue() {
    await this.emailProducer.sendWelcomeEmail(TEST_EMAIL, 'Test User');
    return {
      success: true,
      to: TEST_EMAIL,
      method: 'bullmq-queue',
      note: 'Job enqueued — check Bull Board for status.',
    };
  }
}
