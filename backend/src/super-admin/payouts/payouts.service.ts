import { 
  Injectable, 
  BadRequestException, 
  Logger, 
  NotFoundException 
} from '@nestjs/common';
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';
import { PayoutStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from '../../payment/payment.service';
import { ActivityLogService } from '../../common/services/activity-log.services'; 
// Import Enums correctly
import { RecipientType, PaymentGateway } from '../../payment/dto/payment.dto';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private prisma: PrismaService,
    private ledger: TransactionLedgerService,
    private paymentService: PaymentService,
    private logService: ActivityLogService,
  ) {}

  async getPendingPayouts() {
    const vendorPayouts = await this.prisma.vendorPayout.findMany({
      where: { status: PayoutStatus.PENDING },
      include: { store: { select: { name: true } } }, 
    });

    const riderPayouts = await this.prisma.riderPayout.findMany({
      where: { status: PayoutStatus.PENDING },
      include: {
        rider: {
          select: { name: true },
        },
      },
    });

    return { vendorPayouts, riderPayouts };
  }

  async approvePayout(payoutId: string, type: 'VENDOR' | 'RIDER', adminId: string) {
    // ====================================================
    // STEP 1: LOCK & VALIDATE (Database Transaction 1)
    // ====================================================
    
    const payoutData = await this.prisma.$transaction(async (tx) => {
      // 1. Fetch Payout
      const p = type === 'VENDOR' 
        ? await tx.vendorPayout.findUnique({ where: { id: payoutId } })
        : await tx.riderPayout.findUnique({ where: { id: payoutId } });

      if (!p) throw new NotFoundException('Payout record not found');
      if (p.status !== PayoutStatus.PENDING) {
        throw new BadRequestException(`Payout is ${p.status}, cannot approve.`);
      }
      
      // Safety check for bank account snapshot
      if (!p.bankAccountId) {
         throw new BadRequestException('No bank account snapshot attached to this payout.');
      }

      // 2. Fetch Actual Bank Details (Safe Lookup)
      const bankDetails = await tx.bankAccount.findUnique({
        where: { id: p.bankAccountId },
      });

      if (!bankDetails) {
        throw new BadRequestException('The attached bank account no longer exists.');
      }

      // 3. Update Status to APPROVED (Locking it)
      if (type === 'VENDOR') {
        await tx.vendorPayout.update({ where: { id: payoutId }, data: { status: PayoutStatus.APPROVED } }); 
      } else {
        await tx.riderPayout.update({ where: { id: payoutId }, data: { status: PayoutStatus.APPROVED } });
      }

      return { payout: p, bankDetails };
    });

    // ====================================================
    // STEP 2: EXTERNAL TRANSFER (No DB Transaction)
    // ====================================================
    
    // ✅ FIX 1: Safely access storeId/riderId using Type Assertion or 'any' cast
    // Since we know 'type', we can safely access the specific ID.
    const recipientId = type === 'VENDOR' 
      ? (payoutData.payout as any).storeId 
      : (payoutData.payout as any).riderId;

    let transferResult;
    try {
      this.logger.log(`Initiating Transfer: ${payoutId} -> ${payoutData.bankDetails.accountNumber}`);
      
      transferResult = await this.paymentService.disbursePayment({
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
        recipientType: type === 'VENDOR' ? RecipientType.VENDOR : RecipientType.RIDER,
        gateway: PaymentGateway.PAYSTACK 
      }, adminId);

    } catch (error) {
      this.logger.error(`Transfer Failed for ${payoutId}`, error);
      // DO NOT auto-revert to PENDING. Leave as APPROVED for manual review.
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
            data: { status: PayoutStatus.PAID, processedAt: new Date() } 
          });
        } else {
          await tx.riderPayout.update({ 
            where: { id: payoutId }, 
            data: { status: PayoutStatus.PAID, processedAt: new Date() } 
          });
        }

        // 2. Ledger: Mark COMPLETED (No new debit)
        await this.ledger.finalizePayout(payoutId, 'COMPLETED');
      });

      // 3. Log Activity
      await this.logService.record({
        userId: adminId,
        action: 'PAYOUT_APPROVED',
        target: payoutId,
        details: `Approved ${type} payout of ${payoutData.payout.amount}`,
      });

      return { status: 'SUCCESS' };

    } else {
      // Transfer explicitly failed at Gateway
      await this.prisma.$transaction(async (tx) => {
        // 1. Mark as FAILED
        if (type === 'VENDOR') {
          await tx.vendorPayout.update({ where: { id: payoutId }, data: { status: PayoutStatus.FAILED } });
        } else {
          await tx.riderPayout.update({ where: { id: payoutId }, data: { status: PayoutStatus.FAILED } });
        }

        // 2. Ledger: REFUND the wallet (Credit back)
        await this.ledger.finalizePayout(payoutId, 'FAILED');
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
    const updateData = {
      status: PayoutStatus.REJECTED,
      rejectionReason: reason,
      processedAt: new Date(),
    };

    // 1. Perform Transaction (Update DB + Refund Ledger)
    const result = await this.prisma.$transaction(async (tx) => {
      let payout;
      
      // Update Status
      if (type === 'VENDOR') {
        payout = await tx.vendorPayout.update({ where: { id }, data: updateData });
      } else {
        payout = await tx.riderPayout.update({ where: { id }, data: updateData });
      }

      // Refund the wallet
      await this.ledger.finalizePayout(id, 'FAILED');

      return payout;
    });

    // 2. Log Activity
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