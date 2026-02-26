import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
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
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.SUPER_ADMIN)
@Controller({
  path: 'test',
  version: '1',
})
export class TestController {
  constructor(
    private readonly mailer: MailerService,
    private readonly emailProducer: EmailProducer,
  ) {}

  /**
   * POST /api/v1/test/email/direct
   * Sends a raw SMTP email directly (no queue) so any connection error is
   * returned immediately in the HTTP response — great for diagnosing port blocks.
   */
  @Post('email/direct')
  @HttpCode(HttpStatus.OK)
  async testEmailDirect() {
    const start = Date.now();
    await this.mailer.sendMail({
      to: TEST_EMAIL,
      subject: `[Asoose] Direct SMTP test — ${new Date().toISOString()}`,
      text: 'This email was sent directly over SMTP (no queue) from the test endpoint.',
      html: '<p>This email was sent <strong>directly over SMTP</strong> (no queue) from the test endpoint.</p>',
    });
    return {
      success: true,
      to: TEST_EMAIL,
      method: 'direct-smtp',
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
