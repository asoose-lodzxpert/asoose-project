import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Query,
  Req,
  Res,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import { PaymentService } from './payment.service';
import {
  InitiatePaymentDto,
  VerifyPaymentDto,
  DisbursePaymentDto,
  ProcessRefundDto,
} from './dto/payment.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { PaymentGateway, PaymentStatus } from './interfaces/payment.interface'; // ✅ Added PaymentStatus import
import { UserRole } from '../common/enums/user-role.enum';
import type { Request, Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Payment')
@Controller({
  path: 'payment',
  version: '1',
})
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ summary: 'Initialize a Paystack payment transaction' })
  @ApiBearerAuth()
  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10 payment init/min per IP
  async initiatePayment(
    @Body() dto: InitiatePaymentDto & { callbackUrl?: string },
    @Req() req: Request & { user?: { userId: string } },
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not authenticated');
    }
    const userId = req.user['id'];

    try {
      return await this.paymentService.initiatePayment(dto, userId);
    } catch (error) {
      if (
        error.message &&
        (error.message.includes('Gateway Timeout') ||
          error.message.includes('504') ||
          error.message.includes('502'))
      ) {
        this.logger.error(`Payment Gateway Timeout: ${error.message}`);
        throw new ServiceUnavailableException(
          'Payment provider is temporarily unavailable. Please try again later.',
        );
      }
      // Sanitize unknown errors — do not re-throw raw provider errors
      if (error?.getStatus && typeof error.getStatus === 'function')
        throw error;
      this.logger.error('Unhandled error in initiatePayment', error?.stack);
      throw new InternalServerErrorException(
        'Payment initialization failed. Please try again.',
      );
    }
  }

  @ApiOperation({ summary: 'Verify a payment transaction by reference' })
  @ApiBearerAuth()
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Query() query: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(query.reference, query.gateway);
  }

  // WEBHOOK HANDLERS

  @ApiOperation({ summary: 'Paystack webhook receiver (HMAC-verified)' })
  @Post('webhook/paystack')
  @HttpCode(HttpStatus.OK)
  async paystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    // Use the raw request body (exact bytes) for HMAC signature verification.
    // JSON.stringify(req.body) is unreliable because key ordering or whitespace
    // differences can cause signature mismatches.
    const rawBodyString =
      req.rawBody?.toString('utf8') ?? JSON.stringify(req.body);
    const payload = req.body;
    await this.paymentService.handleWebhook(
      PaymentGateway.PAYSTACK,
      payload,
      signature,
      rawBodyString,
    );
    return { status: 'success' };
  }

  // USER CALLBACK HANDLERS

  @ApiOperation({
    summary: 'Paystack browser redirect callback (redirects to frontend)',
  })
  @Get('callback/paystack')
  async paystackCallback(
    @Query('reference') reference: string,
    @Res() res: Response,
  ) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/+$/, '');

    if (!process.env.FRONTEND_URL) {
      this.logger.warn(
        'FRONTEND_URL is not set — post-payment redirects will use http://localhost:3001. ' +
        'Set FRONTEND_URL to the production web app URL (e.g. https://www.asoose.com).',
      );
    }

    if (!reference) {
      return res.redirect(
        `${frontendUrl}/payment/callback?status=failed&reason=missing_reference`,
      );
    }

    try {
      const verification = await this.paymentService.verifyPayment(
        reference,
        PaymentGateway.PAYSTACK,
      );

      // ✅ FIX: Comparison now matches Enum type
      const statusParam =
        verification.status === PaymentStatus.COMPLETED ? 'success' : 'failed';

      let callbackUrl = verification.meta?.callbackUrl || frontendUrl;

      // Normalise: strip trailing slashes and any trailing /payment/callback path
      // that the frontend may have included, to avoid duplicating the path segment.
      callbackUrl = callbackUrl
        .replace(/\/+$/, '')
        .replace(/\/payment\/callback\/?$/, '');

      // Safety: if the stored callbackUrl is a localhost/dev URL (any port),
      // discard it and use the configured FRONTEND_URL.  In production
      // NEXT_PUBLIC_APP_URL or FRONTEND_URL must be set — but if either is
      // accidentally left as a dev default, this prevents the redirect from
      // going to an unreachable address.
      if (/localhost|127\.0\.0\.1/i.test(callbackUrl) && !frontendUrl.includes('localhost')) {
        callbackUrl = frontendUrl;
      }

      return res.redirect(
        `${callbackUrl}/payment/callback?reference=${reference}&status=${statusParam}`,
      );
    } catch (error) {
      this.logger.error(
        `Paystack callback failed for ${reference}`,
        error?.message,
      );
      // Note: reference is omitted from error redirect to avoid leaking it in
      // browser history / server access logs on failure paths.
      return res.redirect(`${frontendUrl}/payment/callback?status=failed`);
    }
  }

  // ADMIN ACTIONS

  @ApiOperation({ summary: 'Admin: disburse a payment to a recipient' })
  @ApiBearerAuth()
  @Post('admin/disburse')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async disbursePayment(
    @Body() dto: DisbursePaymentDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.paymentService.disbursePayment(dto, req.user.userId);
  }

  @ApiOperation({ summary: 'Admin: process a payment refund' })
  @ApiBearerAuth()
  @Post('admin/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async processRefund(
    @Body() dto: ProcessRefundDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.paymentService.processRefund(dto, req.user.userId);
  }
}
