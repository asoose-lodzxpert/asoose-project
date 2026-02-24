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
} from '@nestjs/common';
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
  async initiatePayment(
    @Body() dto: InitiatePaymentDto & { callbackUrl?: string },
    @Req() req: Request & { user?: { userId: string } },
  ) {
    if (!req.user) {
      throw new Error('User not authenticated');
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
      throw error;
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

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
      if (callbackUrl.includes('localhost:3000')) callbackUrl = frontendUrl;

      return res.redirect(
        `${callbackUrl}/payment/callback?reference=${reference}&status=${statusParam}`,
      );
    } catch (error) {
      this.logger.error(`Paystack callback failed for ${reference}`, error);
      return res.redirect(
        `${frontendUrl}/payment/callback?reference=${reference}&status=failed`,
      );
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
