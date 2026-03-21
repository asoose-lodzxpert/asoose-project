import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';
import { PayoutStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from '../../payment/payment.service';
import { ActivityLogService } from '../../common/services/activity-log.services';
// Import Enums correctly
import { RecipientType, PaymentGateway } from '../../payment/dto/payment.dto';
import { AdminNotificationsService } from 'src/admin/notifications/admin-notifications.service';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private prisma: PrismaService,
    private ledger: TransactionLedgerService,
    private paymentService: PaymentService,
    private logService: ActivityLogService,
    private adminNotificationsService: AdminNotificationsService,
  ) {}

  async getPendingPayouts() {
    return this.getPayouts({ status: 'PENDING' });
  }

  async getPayouts(filters: {
    status?: string;
    type?: string;
    from?: string;
    to?: string;
  }) {
    const { status, type, from, to } = filters;

    const dateFilter: any = {};
    if (from || to) {
      dateFilter.createdAt = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    const statusFilter: any =
      status && status !== 'ALL' ? { status: status as PayoutStatus } : {};

    const vendorSelect = {
      id: true,
      name: true,
      bankAccount: true,
      vendor: { select: { id: true, name: true, email: true, phone: true } },
    };

    const riderSelect = {
      id: true,
      name: true,
      email: true,
      phone: true,
      bankAccount: true,
    };

    let vendorPayouts: any[] = [];
    let riderPayouts: any[] = [];

    if (!type || type === 'ALL' || type === 'VENDOR') {
      vendorPayouts = await this.prisma.vendorPayout.findMany({
        where: { ...statusFilter, ...dateFilter },
        include: { store: { select: vendorSelect } },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!type || type === 'ALL' || type === 'RIDER') {
      riderPayouts = await this.prisma.riderPayout.findMany({
        where: { ...statusFilter, ...dateFilter },
        include: { rider: { select: riderSelect } },
        orderBy: { createdAt: 'desc' },
      });
    }

    const unified = [
      ...vendorPayouts.map((p) => ({
        ...p,
        payoutType: 'VENDOR' as const,
        recipientName: p.store?.name ?? 'Unknown Store',
        bankAccount: p.store?.bankAccount ?? null,
        vendorDetails: p.store?.vendor ?? null,
        store: p.store ?? null,
        rider: null,
      })),
      ...riderPayouts.map((p) => ({
        ...p,
        payoutType: 'RIDER' as const,
        recipientName: p.rider?.name ?? 'Unknown Rider',
        bankAccount: p.rider?.bankAccount ?? null,
        vendorDetails: null,
        store: null,
        rider: p.rider ?? null,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return unified;
  }

  async approvePayout(
    payoutId: string,
    type: 'VENDOR' | 'RIDER',
    adminId: string,
  ) {
    // Guard: type must be a recognized value
    if (type !== 'VENDOR' && type !== 'RIDER') {
      throw new BadRequestException(`Invalid payout type: ${type}.`);
    }

    // ====================================================
    // STEP 1: LOCK & VALIDATE (Database Transaction 1)
    // ====================================================

    const payoutData = await this.prisma.$transaction(async (tx) => {
      // 1. Fetch Payout
      const p =
        type === 'VENDOR'
          ? await tx.vendorPayout.findUnique({ where: { id: payoutId } })
          : await tx.riderPayout.findUnique({ where: { id: payoutId } });

      if (!p) throw new NotFoundException('Payout record not found');
      if (p.status !== PayoutStatus.PENDING) {
        throw new BadRequestException(`Payout is ${p.status}, cannot approve.`);
      }

      // Safety check for bank account snapshot
      if (!p.bankAccountId) {
        throw new BadRequestException(
          'No bank account snapshot attached to this payout.',
        );
      }

      // 2. Fetch Actual Bank Details (Safe Lookup)
      const bankDetails = await tx.bankAccount.findUnique({
        where: { id: p.bankAccountId },
      });

      if (!bankDetails) {
        throw new BadRequestException(
          'The attached bank account no longer exists.',
        );
      }

      // 3. Update Status to APPROVED (Locking it)
      if (type === 'VENDOR') {
        await tx.vendorPayout.update({
          where: { id: payoutId },
          data: { status: PayoutStatus.APPROVED },
        });
      } else {
        await tx.riderPayout.update({
          where: { id: payoutId },
          data: { status: PayoutStatus.APPROVED },
        });
      }

      // 4. Record PAYOUT_APPROVED event in the ledger (same tx — fully atomic)
      await this.ledger.recordPayoutApproved(
        payoutId,
        type,
        p.amount,
        adminId,
        tx,
      );

      return { payout: p, bankDetails };
    });

    // ====================================================
    // STEP 2: EXTERNAL TRANSFER (No DB Transaction)
    // ====================================================

    // ✅ FIX 1: Safely access storeId/riderId using Type Assertion or 'any' cast
    // Since we know 'type', we can safely access the specific ID.
    const recipientId =
      type === 'VENDOR'
        ? (payoutData.payout as any).storeId
        : (payoutData.payout as any).riderId;

    let transferResult;
    try {
      this.logger.log(
        `Initiating Transfer: ${payoutId} -> ${payoutData.bankDetails.accountNumber}`,
      );

      transferResult = await this.paymentService.disbursePayment(
        {
          amount: payoutData.payout.amount,
          bankAccount: {
            accountNumber: payoutData.bankDetails.accountNumber,
            bankCode: payoutData.bankDetails.bankCode,
            accountName: payoutData.bankDetails.accountName,
          },
          reference: payoutData.payout.id, // Idempotency Key
          narration: `Payout ${payoutData.payout.id}`,

          // ✅ FIX 2: Use passed recipientId variable
          recipientId: recipientId,

          // ✅ FIX 3: Use proper Enum values
          recipientType:
            type === 'VENDOR' ? RecipientType.VENDOR : RecipientType.RIDER,
          gateway: PaymentGateway.PAYSTACK,
        },
        adminId,
      );
    } catch (error) {
      this.logger.error(`Transfer Failed for ${payoutId}`, error);
      // DO NOT auto-revert to PENDING. Leave as APPROVED for manual review.
      // Record a PAYOUT_GATEWAY_ERROR ledger entry so auditors can see the failure event.
      await this.ledger.recordGatewayError(
        payoutId,
        type,
        adminId,
        error?.message ?? 'Unknown gateway error',
      );
      throw new BadRequestException('Payment Gateway Error. Check logs.');
    }

    // ====================================================
    // STEP 3: FINALIZE (Database Transaction 2)
    // ====================================================

    if (transferResult.success) {
      await this.prisma.$transaction(async (tx) => {
        // 1. Mark as PAID
        if (type === 'VENDOR') {
          await tx.vendorPayout.update({
            where: { id: payoutId },
            data: { status: PayoutStatus.PAID, processedAt: new Date() },
          });
        } else {
          await tx.riderPayout.update({
            where: { id: payoutId },
            data: { status: PayoutStatus.PAID, processedAt: new Date() },
          });
        }

        // 2. Ledger: Mark COMPLETED (same tx — atomic with status update)
        await this.ledger.finalizePayout(payoutId, 'COMPLETED', tx);
      });

      // 3. Log Activity
      await this.logService.record({
        userId: adminId,
        action: 'PAYOUT_APPROVED',
        target: payoutId,
        details: `Approved ${type} payout of ${payoutData.payout.amount}`,
      });

      // 4. Alert admins if high-value withdrawal (threshold: ₦1,000,000)
      try {
        if (payoutData.payout.amount >= 1000000) {
          await this.adminNotificationsService.notifyHighValueWithdrawal(
            type === 'VENDOR' ? 'VENDOR' : 'RIDER',
            recipientId,
            payoutData.payout.amount,
            {
              accountNumber: payoutData.bankDetails.accountNumber,
              accountName: payoutData.bankDetails.accountName,
              bankName: payoutData.bankDetails.bankName,
            },
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to send high-value withdrawal alert: ${error.message}`,
        );
      }

      return { status: 'SUCCESS' };
    } else {
      // Transfer explicitly failed at Gateway
      await this.prisma.$transaction(async (tx) => {
        // 1. Mark as FAILED
        if (type === 'VENDOR') {
          await tx.vendorPayout.update({
            where: { id: payoutId },
            data: { status: PayoutStatus.FAILED },
          });
        } else {
          await tx.riderPayout.update({
            where: { id: payoutId },
            data: { status: PayoutStatus.FAILED },
          });
        }

        // 2. Ledger: REFUND the wallet (same tx — atomic with status update)
        await this.ledger.finalizePayout(payoutId, 'FAILED', tx);
      });

      return { status: 'FAILED', reason: transferResult.message };
    }
  }

  async rejectPayout(
    id: string,
    type: 'VENDOR' | 'RIDER',
    reason: string,
    adminId: string,
  ) {
    // Guard: type must be a recognized value
    if (type !== 'VENDOR' && type !== 'RIDER') {
      throw new BadRequestException(`Invalid payout type: ${type}.`);
    }

    // Guard: reason is mandatory
    if (!reason?.trim()) {
      throw new BadRequestException('Rejection reason is required.');
    }

    const trimmedReason = reason.trim();

    // 1. Perform Transaction (Validate + Update DB + Refund Ledger)
    const result = await this.prisma.$transaction(async (tx) => {
      // Fetch and validate the payout BEFORE updating
      const existing =
        type === 'VENDOR'
          ? await tx.vendorPayout.findUnique({ where: { id } })
          : await tx.riderPayout.findUnique({ where: { id } });

      if (!existing) {
        throw new NotFoundException('Payout record not found.');
      }

      // Status guard: only PENDING payouts may be rejected
      if (existing.status !== PayoutStatus.PENDING) {
        throw new BadRequestException(
          `Cannot reject a payout with status: ${existing.status}. Only PENDING payouts can be rejected.`,
        );
      }

      const updateData = {
        status: PayoutStatus.REJECTED,
        rejectionReason: trimmedReason,
        processedAt: new Date(),
      };

      // Update Status
      let payout;
      if (type === 'VENDOR') {
        payout = await tx.vendorPayout.update({
          where: { id },
          data: updateData,
        });
      } else {
        payout = await tx.riderPayout.update({
          where: { id },
          data: updateData,
        });
      }

      // Refund the wallet (same tx — atomic with status update)
      await this.ledger.finalizePayout(id, 'FAILED', tx);

      return payout;
    });

    // 2. Log Activity
    await this.logService.record({
      userId: adminId,
      action: 'PAYOUT_REJECTED',
      target: id,
      details: `Rejected ${type} payout. Reason: ${trimmedReason}`,
      metadata: { payoutId: id, type, reason: trimmedReason },
    });

    return result;
  }
}
