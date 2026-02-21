import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * Handles the Paystack `charge.success` webhook event for DVA (Dedicated
 * Virtual Account) bank transfers.  Regular card / pay-with-transfer payments
 * are handled by the normal payment-status flow.
 */
@Injectable()
export class ChargeSuccessHandler {
  private readonly logger = new Logger(ChargeSuccessHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Credits the customer's wallet when a DVA bank transfer is confirmed.
   *
   * Idempotency: we use `payment.reference` as the unique key — if a record
   * already exists and is COMPLETED we skip processing.
   */
  async handleDVATopup(data: any): Promise<void> {
    const reference: string = data.reference;
    const amountKobo: number = data.amount;
    const amountNaira = amountKobo / 100;
    const receiverAccountNumber: string =
      data.authorization?.receiver_bank_account_number ?? '';
    const paidAt = new Date(data.paid_at ?? Date.now());

    this.logger.log(
      `DVA top-up: ref=${reference} amount=₦${amountNaira} receiver=${receiverAccountNumber}`,
    );

    // Idempotency: skip if already processed
    const existing = await this.prisma.payment.findUnique({
      where: { reference },
    });
    if (existing?.status === 'COMPLETED') {
      this.logger.log(`DVA top-up ${reference} already processed — skipping`);
      return;
    }

    // Identify user by their DVA account number
    const user = await this.prisma.user.findFirst({
      where: { dedicatedVirtualAccountNumber: receiverAccountNumber },
      select: { id: true, walletBalance: true, email: true },
    });

    if (!user) {
      this.logger.warn(
        `DVA top-up ${reference}: no user found for account ${receiverAccountNumber}`,
      );
      return;
    }

    const balanceBefore = user.walletBalance;
    const balanceAfter = balanceBefore + amountNaira;

    // Atomic: create Payment record + credit wallet + Transaction ledger entry
    await this.prisma.$transaction(async (tx) => {
      // Upsert a Payment record for this top-up (idempotent)
      await tx.payment.upsert({
        where: { reference },
        update: { status: 'COMPLETED' as any, paidAt, verifiedAt: new Date() },
        create: {
          reference,
          amount: amountNaira,
          gateway: 'PAYSTACK',
          method: 'BANK_TRANSFER' as any,
          status: 'COMPLETED' as any,
          userId: user.id,
          paidAt,
          verifiedAt: new Date(),
          customerEmail: data.customer?.email ?? null,
          metadata: {
            channel: 'dedicated_nuban',
            senderName: data.authorization?.sender_name,
            senderBank: data.authorization?.sender_bank,
            senderAccountNumber: data.authorization?.sender_bank_account_number,
            receiverAccountNumber,
            narration: data.authorization?.narration,
          },
        },
      });

      // Credit user wallet
      await tx.user.update({
        where: { id: user.id },
        data: { walletBalance: { increment: amountNaira } },
      });

      // Ledger Transaction record (WALLET_TOPUP)
      const payment = await tx.payment.findUnique({ where: { reference } });
      await tx.transaction.create({
        data: {
          type: 'WALLET_TOPUP' as any,
          amount: amountNaira,
          description: `Wallet top-up via bank transfer (ref: ${reference})`,
          balanceBefore,
          balanceAfter,
          status: 'COMPLETED' as any,
          paymentId: payment?.id ?? null,
          metadata: {
            channel: 'dedicated_nuban',
            reference,
            senderName: data.authorization?.sender_name,
            senderBank: data.authorization?.sender_bank,
          },
        },
      });
    });

    // Notify user
    try {
      await this.notificationsService.create({
        userId: user.id,
        title: 'Wallet Funded',
        message: `Your wallet has been credited with ₦${amountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
        type: 'WALLET',
        metadata: { reference, amount: amountNaira },
      });
    } catch (err) {
      this.logger.warn(
        `Could not send wallet credit notification: ${err.message}`,
      );
    }

    this.logger.log(
      `DVA top-up processed: user=${user.id} ₦${amountNaira} ref=${reference}`,
    );
  }
}
