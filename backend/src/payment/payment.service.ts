import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { PaymentStatusService } from './payment-status.service';
import { PaymentInitService } from './payment-init.service';
import { PaymentVerifyService } from './payment-verify.service';
import { PaymentDisbursementService } from './payment-disbursement.service';
import { PaystackWebhookHandler } from './webhooks/paystack-webhook.handler';
import { PaymentGateway } from './interfaces/payment.interface';
import type {
  PaymentInitResponse,
  VerifyPaymentResponse,
  DisbursementResponse,
  RefundResponse,
} from './interfaces/payment.interface';
import {
  InitiatePaymentDto,
  DisbursePaymentDto,
  ProcessRefundDto,
} from './dto/payment.dto';

/**
 * Thin orchestrator — delegates to focused sub-services.
 *
 * The public API is intentionally unchanged so `PaymentController` requires
 * no modifications.
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly paystackService: PaystackService,
    private readonly paymentInitService: PaymentInitService,
    private readonly paymentVerifyService: PaymentVerifyService,
    private readonly paymentStatusService: PaymentStatusService,
    private readonly paymentDisbursementService: PaymentDisbursementService,
    private readonly paystackWebhookHandler: PaystackWebhookHandler,
  ) {}

  // ─── Initiation ──────────────────────────────────────────────────────────

  async initiatePayment(
    dto: InitiatePaymentDto,
    userId: string,
  ): Promise<PaymentInitResponse> {
    return this.paymentInitService.initiatePayment(dto, userId);
  }

  // ─── Verification ────────────────────────────────────────────────────────

  async verifyPayment(
    reference: string,
    gateway: PaymentGateway,
  ): Promise<VerifyPaymentResponse & { meta?: { callbackUrl?: string } }> {
    return this.paymentVerifyService.verifyPayment(reference, gateway);
  }

  // ─── Webhooks ────────────────────────────────────────────────────────────

  async handleWebhook(
    gateway: PaymentGateway,
    payload: any,
    signature: string,
    /**
     * Raw request body string (exact bytes from the HTTP request).
     * Required by Paystack for HMAC-SHA512 signature verification.
     * Falls back to JSON.stringify(payload) when not provided.
     */
    rawBody?: string,
  ): Promise<void> {
    let isValid = false;

    switch (gateway) {
      case PaymentGateway.PAYSTACK:
        // Prefer the raw body for signature verification; fall back to
        // re-serialised JSON only when rawBody is unavailable (e.g. tests).
        isValid = this.paystackService.verifyWebhookSignature(
          rawBody ?? JSON.stringify(payload),
          signature,
        );
        break;
    }

    if (!isValid) {
      this.logger.warn(`Invalid webhook signature for ${gateway}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    await this.processWebhookPayload(gateway, payload);
  }

  private async processWebhookPayload(
    gateway: PaymentGateway,
    payload: any,
  ): Promise<void> {
    switch (gateway) {
      case PaymentGateway.PAYSTACK:
        await this.paystackWebhookHandler.process(payload, (v) =>
          this.paymentStatusService.updatePaymentStatus(v),
        );
        break;
    }
  }

  // ─── Disbursement ────────────────────────────────────────────────────────

  async disbursePayment(
    dto: DisbursePaymentDto,
    adminId: string,
  ): Promise<DisbursementResponse> {
    return this.paymentDisbursementService.disbursePayment(dto, adminId);
  }

  async processRefund(
    dto: ProcessRefundDto,
    adminId: string,
  ): Promise<RefundResponse> {
    return this.paymentDisbursementService.processRefund(dto, adminId);
  }
}
