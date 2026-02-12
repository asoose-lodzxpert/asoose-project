import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';
import { PayoutStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentService } from 'src/payment/payment.service';
import { RecipientType, PaymentGateway } from 'src/payment/dto/payment.dto';
import { ActivityLogService } from 'src/common/services/activity-log.services'; // ✅ Import Added

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private prisma: PrismaService,
    private ledger: TransactionLedgerService,
    private paymentService: PaymentService,
    private logService: ActivityLogService, // ✅ Inject Service
  ) {}

  async getPendingPayouts() {
    const vendorPayouts = await this.prisma.vendorPayout.findMany({
      where: { status: PayoutStatus.PENDING },
      include: { store: { select: { name: true, bankAccount: true } } },
    });

    const riderPayouts = await this.prisma.riderPayout.findMany({
      where: { status: PayoutStatus.PENDING },
      include: {
        rider: {
          select: {
            name: true,
            bankAccount: true,
          },
        },
      },
    });

    return { vendorPayouts, riderPayouts };
  }

  async approvePayout(id: string, type: 'VENDOR' | 'RIDER', adminId: string) {
    // 1. Perform Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const payout =
        type === 'VENDOR'
          ? await tx.vendorPayout.findUnique({
              where: { id },
              include: { store: true },
            })
          : await tx.riderPayout.findUnique({
              where: { id },
              include: { rider: true },
            });

      if (!payout) throw new BadRequestException('Payout request not found');

      // Explicitly check status to prevent duplicate processing
      if (payout.status !== PayoutStatus.PENDING) {
        throw new BadRequestException(
          `Action denied: Payout is already ${payout.status}`,
        );
      }

      // Fix TS2339: Narrow the property access for recipientId
      let recipientId: string;
      if (type === 'VENDOR') {
        recipientId = (payout as any).store.vendorId;
      } else {
        recipientId = (payout as any).riderId;
      }

      const recipientType =
        type === 'VENDOR' ? RecipientType.VENDOR : RecipientType.RIDER;

      try {
        const disbursement = await this.paymentService.disbursePayment(
          {
            recipientId,
            recipientType,
            amount: payout.amount,
            gateway: PaymentGateway.PAYSTACK,
            reason: `Payout ${id}`,
            metadata: { payoutId: id, adminId },
          },
          adminId,
        );

        // Fix TS2339: Use status if message doesn't exist on DisbursementResponse
        if (!disbursement.success) {
          throw new Error(disbursement.status || 'Gateway declined transfer');
        }

        // 3. Update Record and Ledger
        const updateData = {
          status: PayoutStatus.PAID,
          processedAt: new Date(),
          reference: disbursement.reference,
        };

        if (type === 'VENDOR') {
          const updated = await tx.vendorPayout.update({
            where: { id },
            data: updateData,
          });
          // Fix TS2345: Convert null reference to undefined for ledger compatibility
          await this.ledger.recordVendorPayout({
            ...updated,
            status: 'PAID',
            reference: updated.reference ?? undefined,
          });
          return updated;
        } else {
          const updated = await tx.riderPayout.update({
            where: { id },
            data: updateData,
          });
          // Fix TS2345: Convert null reference to undefined for ledger compatibility
          await this.ledger.recordRiderPayout({
            ...updated,
            status: 'PAID',
            reference: updated.reference ?? undefined,
          });
          return updated;
        }
      } catch (error) {
        this.logger.error(
          `Disbursement failed for payout ${id}: ${error.message}`,
        );
        throw new BadRequestException(`Bank Transfer Failed: ${error.message}`);
      }
    });

    // 2. ✅ Log Activity (Outside Transaction)
    await this.logService.record({
      userId: adminId,
      action: 'PAYOUT_APPROVED',
      target: id,
      details: `Approved ${type} payout of ${result.amount}`,
      metadata: { payoutId: id, type, amount: result.amount },
    });

    return result;
  }

  async rejectPayout(
    id: string,
    type: 'VENDOR' | 'RIDER',
    reason: string,
    adminId: string,
  ) {
    const updateData = {
      status: PayoutStatus.REJECTED,
      rejectionReason: reason,
    };

    // 1. Perform Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      if (type === 'VENDOR') {
        const payout = await tx.vendorPayout.update({
          where: { id },
          data: updateData,
        });
        // Fix TS2345: Handle null reference
        await this.ledger.recordVendorPayout({
          ...payout,
          status: 'FAILED',
          reference: payout.reference ?? undefined,
        });
        return payout;
      } else {
        const payout = await tx.riderPayout.update({
          where: { id },
          data: updateData,
        });
        // Fix TS2345: Handle null reference
        await this.ledger.recordRiderPayout({
          ...payout,
          status: 'FAILED',
          reference: payout.reference ?? undefined,
        });
        return payout;
      }
    });

    // 2. ✅ Log Activity (Outside Transaction)
    await this.logService.record({
      userId: adminId,
      action: 'PAYOUT_REJECTED',
      target: id,
      details: `Rejected ${type} payout. Reason: ${reason}`,
      metadata: { payoutId: id, type, reason },
    });

    return result;
  }
}
