import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';
import { PayoutStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentService } from 'src/payment/payment.service';
import { RecipientType, PaymentGateway } from 'src/payment/dto/payment.dto'; 

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private prisma: PrismaService,
    private ledger: TransactionLedgerService,
    private paymentService: PaymentService,
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
    // 1. Fetch Payout Details First (To get amount & recipient)
    let payout: any;
    let recipientId: string;
    let recipientType: RecipientType;

    if (type === 'VENDOR') {
      payout = await this.prisma.vendorPayout.findUnique({
        where: { id },
        include: { store: true }, // Need store to get vendorId
      });
      if (!payout) throw new BadRequestException('Vendor payout not found');
      
      // Check if already paid to prevent double-spending
      if (payout.status === PayoutStatus.PAID) {
         throw new BadRequestException('Payout already processed');
      }

      recipientId = payout.store.vendorId; 
      recipientType = RecipientType.VENDOR;
    } else {
      payout = await this.prisma.riderPayout.findUnique({
        where: { id },
        include: { rider: true },
      });
      if (!payout) throw new BadRequestException('Rider payout not found');
      
      if (payout.status === PayoutStatus.PAID) {
         throw new BadRequestException('Payout already processed');
      }

      recipientId = payout.riderId;
      recipientType = RecipientType.RIDER;
    }

    // 2. TRIGGER REAL MONEY TRANSFER
    this.logger.log(`Initiating Gateway Transfer for ${type} ${id}`);
    
    // Default to PAYSTACK or fetch preference from system settings
    const gateway = PaymentGateway.PAYSTACK; 

    try {
      // This actually talks to the bank
      const disbursement = await this.paymentService.disbursePayment(
        {
          recipientId,
          recipientType,
          amount: payout.amount,
          gateway,
          reason: `Payout ${payout.reference || id}`,
          metadata: { payoutId: id, adminId },
        },
        adminId
      );

      if (!disbursement.success && disbursement.status !== 'PENDING') {
         throw new Error(`Gateway declined transfer: ${disbursement.status}`);
      }

      // 3. UPDATE DB ONLY IF GATEWAY ACCEPTED
      return this.prisma.$transaction(async (tx) => {
        const commonUpdateData: any = {
          status: 'PAID',
          processedAt: new Date(),
          reference: disbursement.reference, // Store the REAL bank reference
        };

        if (type === 'VENDOR') {
          const updated = await tx.vendorPayout.update({
            where: { id },
            data: commonUpdateData,
          });

          await this.ledger.recordVendorPayout({
            id: updated.id,
            storeId: updated.storeId,
            amount: updated.amount,
            status: 'PAID',
            reference: disbursement.reference,
          });
          return updated;
        } else {
          const updated = await tx.riderPayout.update({
            where: { id },
            data: commonUpdateData,
          });

          await this.ledger.recordRiderPayout({
            id: updated.id,
            riderId: updated.riderId,
            amount: updated.amount,
            status: 'PAID',
            reference: disbursement.reference,
          });
          return updated;
        }
      });

    } catch (error) {
      this.logger.error(`Payout Failed for ${id}`, error);
      // Do NOT set status to PAID. Throw error so Admin knows it failed.
      throw new BadRequestException(`Payout failed: ${error.message}`);
    }
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