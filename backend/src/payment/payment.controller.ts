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
  Logger,
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
import { UserRole } from '../common/enums/user-role.enum';
import { Request } from 'express';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

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

  // Monnify Webhooks
  // Transaction Completion Webhook
  @Post('webhook/monnify/transaction')
  @HttpCode(HttpStatus.OK)
  async monnifyTransactionWebhook(
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

  // Refund Completion Webhook
  @Post('webhook/monnify/refund')
  @HttpCode(HttpStatus.OK)
  async monnifyRefundWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('monnify-signature') signature: string,
  ) {
    const payload = req.body;
    this.logger.log('Monnify Refund Webhook received:', payload);
    await this.paymentService.handleMonnifyRefundWebhook(payload, signature);
    return { status: 'success' };
  }

  // Disbursement Webhook (for payouts to vendors/riders)
  @Post('webhook/monnify/disbursement')
  @HttpCode(HttpStatus.OK)
  async monnifyDisbursementWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('monnify-signature') signature: string,
  ) {
    const payload = req.body;
    this.logger.log('Monnify Disbursement Webhook received');
    // TODO: Implement disbursement webhook handling
    return { status: 'success' };
  }

  // Settlement Webhook
  @Post('webhook/monnify/settlement')
  @HttpCode(HttpStatus.OK)
  async monnifySettlementWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('monnify-signature') signature: string,
  ) {
    const payload = req.body;
    this.logger.log('Monnify Settlement Webhook received');
    // TODO: Implement settlement webhook handling
    return { status: 'success' };
  }

  // Mandate Webhook (for recurring payments)
  @Post('webhook/monnify/mandate')
  @HttpCode(HttpStatus.OK)
  async monnifyMandateWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('monnify-signature') signature: string,
  ) {
    const payload = req.body;
    this.logger.log('Monnify Mandate Webhook received');
    // TODO: Implement mandate webhook handling
    return { status: 'success' };
  }

  // Wallet Activity Notification Webhook
  @Post('webhook/monnify/wallet-activity')
  @HttpCode(HttpStatus.OK)
  async monnifyWalletActivityWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('monnify-signature') signature: string,
  ) {
    const payload = req.body;
    this.logger.log('Monnify Wallet Activity Webhook received');
    // TODO: Implement wallet activity webhook handling
    return { status: 'success' };
  }

  // Low Balance Notification Webhook
  @Post('webhook/monnify/low-balance')
  @HttpCode(HttpStatus.OK)
  async monnifyLowBalanceWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('monnify-signature') signature: string,
  ) {
    const payload = req.body;
    this.logger.log('Monnify Low Balance Webhook received');
    // TODO: Implement low balance notification handling
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
