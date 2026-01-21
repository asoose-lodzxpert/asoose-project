import { Injectable } from '@nestjs/common';
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';
import { PayoutStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PayoutsService {
  constructor(
    private prisma: PrismaService,
    private ledger: TransactionLedgerService,
  ) {}

  // REPLACE 'getPendingPayouts' method
  async getPendingPayouts() {
    const vendorPayouts = await this.prisma.vendorPayout.findMany({
      where: { status: PayoutStatus.PENDING },
      include: { store: { select: { name: true, bankAccount: true } } },
    });

    const riderPayouts = await this.prisma.riderPayout.findMany({
      where: { status: PayoutStatus.PENDING },
      include: {
        // Fixed: Schema uses 'rider', not 'riderProfile'
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

  // REPLACE 'approvePayout' method
  async approvePayout(id: string, type: 'VENDOR' | 'RIDER', adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const commonUpdateData: any = {
        status: 'PAID',
        processedAt: new Date(),
      };

      if (type === 'VENDOR') {
        const payout = await tx.vendorPayout.update({
          where: { id },
          data: commonUpdateData,
        });

        // Commission rate will be fetched from Store table by ledger service
        await this.ledger.recordVendorPayout({
          id: payout.id,
          storeId: payout.storeId,
          amount: payout.amount,
          status: 'PAID',
          reference: payout.reference || undefined,
          // commissionRate not provided - will be fetched from Store.commissionRate
        });

        return payout;
      } else {
        const payout = await tx.riderPayout.update({
          where: { id },
          data: commonUpdateData,
        });

        // Commission rate will be fetched from Rider table by ledger service
        await this.ledger.recordRiderPayout({
          id: payout.id,
          riderId: payout.riderId,
          amount: payout.amount,
          status: 'PAID',
          reference: payout.reference || undefined,
          // commissionRate not provided - will be fetched from Rider.commissionRate
        });

        return payout;
      }
    });
  }

  async rejectPayout(id: string, type: 'VENDOR' | 'RIDER', reason: string) {
    const updateData = {
      status: PayoutStatus.FAILED,
      rejectionReason: reason,
    };

    if (type === 'VENDOR') {
      const payout = await this.prisma.vendorPayout.update({
        where: { id },
        data: updateData,
      });

      // Sync failure to ledger
      await this.ledger.recordVendorPayout({
        id: payout.id,
        storeId: payout.storeId,
        amount: payout.amount,
        status: 'FAILED',
      });

      return payout;
    } else {
      const payout = await this.prisma.riderPayout.update({
        where: { id },
        data: updateData,
      });

      // Sync failure to ledger
      await this.ledger.recordRiderPayout({
        id: payout.id,
        riderId: payout.riderId,
        amount: payout.amount,
        status: 'FAILED',
        reference: payout.reference || undefined,
      });

      return payout;
    }
  }
}
