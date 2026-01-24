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
import type { Request, Response } from 'express';

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  async initiatePayment(
    @Body() dto: InitiatePaymentDto & { callbackUrl?: string },
    @Req() req: Request & { user?: { userId: string } },
  ) {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    const userId = req.user['userId'] || req.user['id'];
    return this.paymentService.initiatePayment(dto, userId);
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Query() query: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(query.reference, query.gateway);
  }

  // =================================================================
  // WEBHOOK HANDLERS (Server-to-Server)
  // =================================================================

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

  @Post('webhook/monnify/refund')
  @HttpCode(HttpStatus.OK)
  async monnifyRefundWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('monnify-signature') signature: string,
  ) {
    const payload = req.body;
    await this.paymentService.handleMonnifyRefundWebhook(payload, signature);
    return { status: 'success' };
  }

  // =================================================================
  // USER CALLBACK HANDLERS (Browser Redirects)
  // =================================================================

// ... imports ...

@Get('callback/paystack')
async paystackCallback(
@Query('reference') reference: string,
@Res() res: Response,
) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    if (!reference) {
        return res.redirect(`${frontendUrl}/payment/callback?status=failed&reason=missing_reference`);
    }

    try {
        // Backend performs the heavy lifting
        const verification = await this.paymentService.verifyPayment(
            reference,
            PaymentGateway.PAYSTACK,
        );

        // Normalize status for URL param (Frontend will still verify independently)
        const statusParam = verification.status === 'SUCCESS' ? 'success' : 'failed';
        
        let callbackUrl = verification.meta?.callbackUrl || frontendUrl;
        if (callbackUrl.includes('localhost:3000')) callbackUrl = frontendUrl;

        return res.redirect(`${callbackUrl}/payment/callback?reference=${reference}&status=${statusParam}`);
    } catch (error) {
        this.logger.error(`Paystack callback failed for ${reference}`, error);
        return res.redirect(`${frontendUrl}/payment/callback?reference=${reference}&status=failed`);
    }
}


  @Get('webhook/flutterwave/callback')
  async flutterwaveCallback(
    @Query('tx_ref') reference: string,
    @Query('transaction_id') transactionId: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    try {
      const idToVerify = transactionId || reference;
      const verification = await this.paymentService.verifyPayment(
        idToVerify,
        PaymentGateway.FLUTTERWAVE,
      );

      let callbackUrl = verification.meta?.callbackUrl;

      // FIX: Force Frontend URL if missing or incorrect
      if (!callbackUrl || callbackUrl.includes('localhost:3000')) {
        callbackUrl = frontendUrl;
      }

      const status = verification.success ? 'success' : 'failed';
      const redirectUrl = `${callbackUrl}/payment/callback?reference=${verification.reference}&status=${status}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error(`Flutterwave callback failed for ${reference}`, error);
      return res.redirect(
        `${frontendUrl}/payment/callback?reference=${reference}&status=failed`,
      );
    }
  }

  @Get('webhook/monnify/callback')
  async monnifyCallback(
    @Query('paymentReference') reference: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    try {
      const verification = await this.paymentService.verifyPayment(
        reference,
        PaymentGateway.MONNIFY,
      );

      let callbackUrl = verification.meta?.callbackUrl;

      // FIX: Force Frontend URL if missing or incorrect
      if (!callbackUrl || callbackUrl.includes('localhost:3000')) {
        callbackUrl = frontendUrl;
      }

      const status = verification.success ? 'success' : 'failed';
      const redirectUrl = `${callbackUrl}/payment/callback?reference=${reference}&status=${status}`;
      return res.redirect(redirectUrl);
    } catch (error) {
      this.logger.error(`Monnify callback failed for ${reference}`, error);
      return res.redirect(
        `${frontendUrl}/payment/callback?reference=${reference}&status=failed`,
      );
    }
  }

  // =================================================================
  // ADMIN ACTIONS
  // =================================================================

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