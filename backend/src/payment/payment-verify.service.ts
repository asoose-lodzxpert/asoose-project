import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from './paystack.service';
import { PaymentStatusService } from './payment-status.service';
import { PaymentGateway } from './interfaces/payment.interface';
import type { VerifyPaymentResponse } from './interfaces/payment.interface';

/**
 * Handles payment verification: queries the gateway to confirm the final
 * payment status, triggers the status-update flow, and auto-saves reusable
 * card authorisations.
 */
@Injectable()
export class PaymentVerifyService {
  private readonly logger = new Logger(PaymentVerifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
    private readonly paymentStatusService: PaymentStatusService,
  ) {}

  async verifyPayment(
    reference: string,
    gateway: PaymentGateway,
  ): Promise<VerifyPaymentResponse & { meta?: { callbackUrl?: string } }> {
    let verification: VerifyPaymentResponse;

    try {
      switch (gateway) {
        case PaymentGateway.PAYSTACK:
          verification = await this.paystackService.verifyPayment(reference);
          break;
        default:
          throw new BadRequestException('Invalid payment gateway');
      }
    } catch (err) {
      this.logger.error(
        `Verification failed at gateway level for ${reference}`,
        err,
      );
      throw err;
    }

    await this.paymentStatusService.updatePaymentStatus(verification);

    // Auto-save card authorisation for future charges (if reusable card payment)
    if (verification.success && verification.cardAuthorization?.reusable) {
      try {
        const payment = await this.prisma.payment.findUnique({
          where: { reference },
          select: { userId: true },
        });
        if (payment?.userId) {
          const auth = verification.cardAuthorization;
          await this.prisma.savedCard.upsert({
            where: {
              userId_last4_expiryYear_expiryMonth: {
                userId: payment.userId,
                last4: auth.last4,
                expiryYear: auth.expiryYear,
                expiryMonth: auth.expiryMonth,
              },
            },
            update: { authorizationCode: auth.authorizationCode },
            create: {
              userId: payment.userId,
              authorizationCode: auth.authorizationCode,
              last4: auth.last4,
              brand: auth.brand,
              expiryMonth: auth.expiryMonth,
              expiryYear: auth.expiryYear,
              bin: auth.bin,
              bank: auth.bank,
              cardType: auth.cardType,
              accountName: auth.accountName,
            },
          });
          this.logger.log(
            `Card saved for user ${payment.userId} (${auth.brand} ****${auth.last4})`,
          );
        }
      } catch (err) {
        this.logger.warn(`Failed to save card authorisation: ${err.message}`);
      }
    }

    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      select: { metadata: true },
    });

    let callbackUrl: string | undefined;
    if (
      payment?.metadata &&
      typeof payment.metadata === 'object' &&
      !Array.isArray(payment.metadata)
    ) {
      const meta = payment.metadata as Record<string, any>;
      callbackUrl = meta.callbackUrl;
    }

    return { ...verification, meta: { callbackUrl } };
  }
}
