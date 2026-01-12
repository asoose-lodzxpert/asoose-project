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
import { PaymentGateway } from './interfaces/payment.interface';
import { UserRole } from '@prisma/client';
import { Request } from 'express';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  async initiatePayment(
    @Body() dto: InitiatePaymentDto,
    @Req() req: Request & { user?: { userId: string } },
  ) {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    return this.paymentService.initiatePayment(dto, req.user['userId']);
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Query() query: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(query.reference, query.gateway);
  }

  // Paystack Webhook
  @Post('webhook/paystack')
  @HttpCode(HttpStatus.OK)
  async paystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const payload = req.body;
    await this.paymentService.handleWebhook(
      PaymentGateway.PAYSTACK,
      payload,
      signature,
    );
    return { status: 'success' };
  }

  // Flutterwave Webhook
  @Post('webhook/flutterwave')
  @HttpCode(HttpStatus.OK)
  async flutterwaveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('verif-hash') signature: string,
  ) {
    const payload = req.body;
    await this.paymentService.handleWebhook(
      PaymentGateway.FLUTTERWAVE,
      payload,
      signature,
    );
    return { status: 'success' };
  }

  // Monnify Webhook
  @Post('webhook/monnify')
  @HttpCode(HttpStatus.OK)
  async monnifyWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('monnify-signature') signature: string,
  ) {
    const payload = req.body;
    await this.paymentService.handleWebhook(
      PaymentGateway.MONNIFY,
      payload,
      signature,
    );
    return { status: 'success' };
  }

  // Callback URLs (for redirects after payment)
  @Get('webhook/paystack/callback')
  @HttpCode(HttpStatus.OK)
  async paystackCallback(@Query('reference') reference: string) {
    const verification = await this.paymentService.verifyPayment(
      reference,
      PaymentGateway.PAYSTACK,
    );

    // Redirect to frontend with payment status
    const frontendUrl = process.env.CUSTOMER_WEB_URL || 'http://localhost:3001';
    const redirectUrl = `${frontendUrl}/payment/callback?reference=${reference}&status=${verification.status}`;

    return {
      message: 'Payment processed',
      redirectUrl,
      ...verification,
    };
  }

  @Get('webhook/flutterwave/callback')
  @HttpCode(HttpStatus.OK)
  async flutterwaveCallback(
    @Query('tx_ref') reference: string,
    @Query('transaction_id') transactionId: string,
  ) {
    const verification = await this.paymentService.verifyPayment(
      transactionId,
      PaymentGateway.FLUTTERWAVE,
    );

    const frontendUrl = process.env.CUSTOMER_WEB_URL || 'http://localhost:3001';
    const redirectUrl = `${frontendUrl}/payment/callback?reference=${reference}&status=${verification.status}`;

    return {
      message: 'Payment processed',
      redirectUrl,
      ...verification,
    };
  }

  @Get('webhook/monnify/callback')
  @HttpCode(HttpStatus.OK)
  async monnifyCallback(@Query('paymentReference') reference: string) {
    const verification = await this.paymentService.verifyPayment(
      reference,
      PaymentGateway.MONNIFY,
    );

    const frontendUrl = process.env.CUSTOMER_WEB_URL || 'http://localhost:3001';
    const redirectUrl = `${frontendUrl}/payment/callback?reference=${reference}&status=${verification.status}`;

    return {
      message: 'Payment processed',
      redirectUrl,
      ...verification,
    };
  }

  // Admin Endpoints
  @Post('admin/disburse')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async disbursePayment(
    @Body() dto: DisbursePaymentDto,
    @Req() req: Request & { user: { userId: string } },
  ) {
    return this.paymentService.disbursePayment(dto, req.user.userId);
  }

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
