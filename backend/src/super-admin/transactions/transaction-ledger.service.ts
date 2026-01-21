import { PrismaService } from 'src/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

/**
 * Transaction Ledger Helper
 * Use these functions to record transactions whenever money moves in the system
 */

@Injectable()
export class TransactionLedgerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record a payment from customer (order or ride)
   */
  async recordPayment(payment: {
    id: string;
    amount: number;
    userId: string;
    orderId?: string;
    rideId?: string;
    method: string;
    status: string;
  }) {
    const description = payment.orderId
      ? 'Payment for order'
      : payment.rideId
        ? 'Payment for ride'
        : 'Wallet top-up';

    return this.prisma.transaction.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        amount: payment.amount,
        paymentId: payment.id,
        orderId: payment.orderId,
        rideId: payment.rideId,
        description,
        status: payment.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        balanceBefore: 0, // Platform balance (if tracking)
        balanceAfter: 0,
        metadata: {
          method: payment.method,
          userId: payment.userId,
        },
      },
    });
  }

  /**
   * Record vendor earning from an order
   * Note: Commission is deducted later during withdrawal, not here
   */
  async recordOrderCommission(order: {
    id: string;
    storeId: string;
    total: number;
    commissionRate: number;
  }) {
    // Vendor receives 100% of order total
    // Commission will be deducted when they request withdrawal
    const vendorEarning = order.total;

    // Use atomic transaction to ensure wallet update and transaction records happen together
    return this.prisma.$transaction(async (tx) => {
      // Get current vendor balance
      const store = await tx.store.findUnique({
        where: { id: order.storeId },
        select: { walletBalance: true },
      });

      const currentBalance = store?.walletBalance || 0;

      // Record vendor earning (full amount)
      await tx.transaction.create({
        data: {
          type: 'VENDOR_EARNING',
          amount: vendorEarning,
          entityType: 'STORE',
          entityId: order.storeId,
          orderId: order.id,
          description:
            'Order earnings credited to wallet (commission deducted on withdrawal)',
          status: 'COMPLETED',
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + vendorEarning,
          metadata: {
            orderTotal: order.total,
            commissionRate: order.commissionRate,
            commissionDeductedOnWithdrawal: true,
          },
        },
      });

      // Update store wallet balance (full amount)
      await tx.store.update({
        where: { id: order.storeId },
        data: {
          walletBalance: { increment: vendorEarning },
          totalRevenue: { increment: order.total },
        },
      });

      return { vendorEarning };
    });
  }

  /**
   * Record ride earnings
   * Note: Commission is deducted later during withdrawal, not here
   */
  async recordRideEarnings(ride: {
    id: string;
    riderId: string;
    totalFare: number;
    platformFee: number;
    driverFee: number;
  }) {
    // Rider receives 100% of total fare
    // Commission will be deducted when they request withdrawal
    const riderEarning = ride.totalFare;

    // Use atomic transaction to ensure wallet update and transaction records happen together
    return this.prisma.$transaction(async (tx) => {
      const rider = await tx.rider.findUnique({
        where: { id: ride.riderId },
        select: { walletBalance: true },
      });

      const currentBalance = rider?.walletBalance || 0;

      // Record rider earning (full amount)
      await tx.transaction.create({
        data: {
          type: 'RIDER_EARNING',
          amount: riderEarning,
          entityType: 'RIDER',
          entityId: ride.riderId,
          rideId: ride.id,
          description:
            'Ride earnings credited to wallet (commission deducted on withdrawal)',
          status: 'COMPLETED',
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + riderEarning,
          metadata: {
            totalFare: ride.totalFare,
            platformFee: ride.platformFee,
            commissionDeductedOnWithdrawal: true,
          },
        },
      });

      // Update rider wallet balance (full amount)
      await tx.rider.update({
        where: { id: ride.riderId },
        data: {
          walletBalance: { increment: riderEarning },
        },
      });

      return { riderEarning };
    });
  }

  /**
   * Record delivery earnings
   * Note: Commission is deducted later during withdrawal, not here
   */
  async recordDeliveryEarnings(delivery: {
    id: string;
    riderId: string;
    deliveryFee: number;
  }) {
    // Rider receives 100% of delivery fee
    // Commission will be deducted when they request withdrawal
    const riderEarning = delivery.deliveryFee;

    // Use atomic transaction to ensure wallet update and transaction records happen together
    return this.prisma.$transaction(async (tx) => {
      const rider = await tx.rider.findUnique({
        where: { id: delivery.riderId },
        select: { walletBalance: true },
      });

      const currentBalance = rider?.walletBalance || 0;

      // Record rider earning (full amount)
      await tx.transaction.create({
        data: {
          type: 'RIDER_EARNING',
          amount: riderEarning,
          entityType: 'RIDER',
          entityId: delivery.riderId,
          deliveryId: delivery.id,
          description:
            'Delivery earnings credited to wallet (commission deducted on withdrawal)',
          status: 'COMPLETED',
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + riderEarning,
          metadata: {
            deliveryFee: delivery.deliveryFee,
            platformFeeRate: 15,
            commissionDeductedOnWithdrawal: true,
          },
        },
      });

      // Update rider wallet balance (full amount)
      await tx.rider.update({
        where: { id: delivery.riderId },
        data: {
          walletBalance: { increment: riderEarning },
        },
      });

      return { riderEarning };
    });
  }

  /**
   * Record vendor payout request and completion
   * Commission is deducted during payout (not when earnings are credited)
   */
  async recordVendorPayout(payout: {
    id: string;
    storeId: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'FAILED';
    reference?: string;
    commissionRate?: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const store = await tx.store.findUnique({
        where: { id: payout.storeId },
        select: { walletBalance: true, commissionRate: true },
      });

      const currentBalance = store?.walletBalance || 0;

      const commissionRate =
        payout.commissionRate ?? store?.commissionRate ?? 10;
      const commission = payout.amount * (commissionRate / 100);
      const netPayout = payout.amount - commission;

      if (payout.status === 'PENDING') {
        return tx.transaction.create({
          data: {
            type: 'PAYOUT_REQUESTED',
            amount: payout.amount,
            entityType: 'STORE',
            entityId: payout.storeId,
            vendorPayoutId: payout.id,
            description: `Payout requested (${commissionRate}% commission will be deducted)`,
            status: 'PENDING',
            balanceBefore: currentBalance,
            balanceAfter: currentBalance,
            metadata: {
              reference: payout.reference,
              commissionRate,
              commission,
              netPayout,
            },
          },
        });
      }

      if (payout.status === 'PAID') {
        await tx.transaction.updateMany({
          where: {
            vendorPayoutId: payout.id,
            type: 'PAYOUT_REQUESTED',
          },
          data: { status: 'COMPLETED' },
        });

        await tx.transaction.create({
          data: {
            type: 'COMMISSION_DEDUCTED',
            amount: commission,
            entityType: 'PLATFORM',
            vendorPayoutId: payout.id,
            description: `Platform commission (${commissionRate}%) deducted from payout`,
            status: 'COMPLETED',
            balanceBefore: 0,
            balanceAfter: 0,
            metadata: {
              storeId: payout.storeId,
              commissionRate,
              payoutAmount: payout.amount,
              netPayout,
            },
          },
        });

        await tx.transaction.create({
          data: {
            type: 'PAYOUT_COMPLETED',
            amount: netPayout,
            entityType: 'STORE',
            entityId: payout.storeId,
            vendorPayoutId: payout.id,
            description: `Payout transferred to bank (₦${netPayout.toLocaleString()} after ${commissionRate}% commission)`,
            status: 'COMPLETED',
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - payout.amount,
            metadata: {
              reference: payout.reference,
              grossAmount: payout.amount,
              commission,
              netPayout,
              commissionRate,
            },
          },
        });

        await tx.store.update({
          where: { id: payout.storeId },
          data: {
            walletBalance: { decrement: payout.amount },
          },
        });
      }

      if (payout.status === 'FAILED') {
        await tx.transaction.updateMany({
          where: {
            vendorPayoutId: payout.id,
            type: 'PAYOUT_REQUESTED',
          },
          data: {
            status: 'FAILED',
            description: 'Payout failed - amount returned to wallet',
          },
        });
      }
    });
  }

  /**
   * Record rider payout
   * Commission is deducted during payout (not when earnings are credited)
   */
  async recordRiderPayout(payout: {
    id: string;
    riderId: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'FAILED';
    reference?: string;
    commissionRate?: number; // Optional override; if not provided, fetched from Rider
  }) {
    // Use atomic transaction to ensure wallet update and transaction records happen together
    return this.prisma.$transaction(async (tx) => {
      const rider = await tx.rider.findUnique({
        where: { id: payout.riderId },
        select: { walletBalance: true, commissionRate: true },
      });

      const currentBalance = rider?.walletBalance || 0;
      // Use provided rate, or fetch from rider, or default to 20%
      const commissionRate =
        payout.commissionRate ?? rider?.commissionRate ?? 20;
      const commission = payout.amount * (commissionRate / 100);
      const netPayout = payout.amount - commission;

      if (payout.status === 'PENDING') {
        return tx.transaction.create({
          data: {
            type: 'PAYOUT_REQUESTED',
            amount: payout.amount,
            entityType: 'RIDER',
            entityId: payout.riderId,
            riderPayoutId: payout.id,
            description: `Payout requested (${commissionRate}% commission will be deducted)`,
            status: 'PENDING',
            balanceBefore: currentBalance,
            balanceAfter: currentBalance,
            metadata: {
              reference: payout.reference,
              commissionRate,
              commission,
              netPayout,
            },
          },
        });
      }

      if (payout.status === 'PAID') {
        await tx.transaction.updateMany({
          where: {
            riderPayoutId: payout.id,
            type: 'PAYOUT_REQUESTED',
          },
          data: { status: 'COMPLETED' },
        });

        // Record commission deduction
        await tx.transaction.create({
          data: {
            type: 'COMMISSION_DEDUCTED',
            amount: commission,
            entityType: 'PLATFORM',
            riderPayoutId: payout.id,
            description: `Platform commission (${commissionRate}%) deducted from payout`,
            status: 'COMPLETED',
            balanceBefore: 0,
            balanceAfter: 0,
            metadata: {
              riderId: payout.riderId,
              commissionRate,
              payoutAmount: payout.amount,
              netPayout,
            },
          },
        });

        await tx.transaction.create({
          data: {
            type: 'PAYOUT_COMPLETED',
            amount: netPayout,
            entityType: 'RIDER',
            entityId: payout.riderId,
            riderPayoutId: payout.id,
            description: `Payout transferred to bank (₦${netPayout.toLocaleString()} after ${commissionRate}% commission)`,
            status: 'COMPLETED',
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - payout.amount,
            metadata: {
              reference: payout.reference,
              grossAmount: payout.amount,
              commission,
              netPayout,
              commissionRate,
            },
          },
        });

        await tx.rider.update({
          where: { id: payout.riderId },
          data: {
            walletBalance: { decrement: payout.amount },
          },
        });
      }

      if (payout.status === 'FAILED') {
        await tx.transaction.updateMany({
          where: {
            riderPayoutId: payout.id,
            type: 'PAYOUT_REQUESTED',
          },
          data: {
            status: 'FAILED',
            description: 'Payout failed - amount returned to wallet',
          },
        });
      }
    });
  }

  /**
   * Record refund
   */
  async recordRefund(payment: {
    id: string;
    amount: number;
    userId: string;
    orderId?: string;
    rideId?: string;
  }) {
    return this.prisma.transaction.create({
      data: {
        type: 'REFUND_ISSUED',
        amount: payment.amount,
        paymentId: payment.id,
        orderId: payment.orderId,
        rideId: payment.rideId,
        description: 'Refund issued to customer',
        status: 'COMPLETED',
        balanceBefore: 0,
        balanceAfter: 0,
        metadata: {
          userId: payment.userId,
        },
      },
    });
  }

  /**
   * Record manual adjustment (admin action)
   */
  async recordAdjustment(data: {
    entityType: 'STORE' | 'RIDER';
    entityId: string;
    amount: number;
    reason: string;
    adminUserId: string;
  }) {
    // Get current balance
    let currentBalance = 0;

    if (data.entityType === 'STORE') {
      const store = await this.prisma.store.findUnique({
        where: { id: data.entityId },
        select: { walletBalance: true },
      });
      currentBalance = store?.walletBalance || 0;

      // Update store balance
      await this.prisma.store.update({
        where: { id: data.entityId },
        data: {
          walletBalance: { increment: data.amount },
        },
      });
    } else {
      const rider = await this.prisma.rider.findUnique({
        where: { id: data.entityId },
        select: { walletBalance: true },
      });
      currentBalance = rider?.walletBalance || 0;

      await this.prisma.rider.update({
        where: { id: data.entityId },
        data: {
          walletBalance: { increment: data.amount },
        },
      });
    }

    return this.prisma.transaction.create({
      data: {
        type: 'ADJUSTMENT',
        amount: data.amount,
        entityType: data.entityType,
        entityId: data.entityId,
        description: `Manual adjustment: ${data.reason}`,
        status: 'COMPLETED',
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + data.amount,
        processedBy: data.adminUserId,
        metadata: {
          reason: data.reason,
        },
      },
    });
  }
}

/**
 * USAGE EXAMPLES:
 *
 * 1. When order is completed and paid:
 *    await ledgerService.recordPayment(payment);
 *    await ledgerService.recordOrderCommission(order);
 *
 * 2. When ride is completed:
 *    await ledgerService.recordPayment(payment);
 *    await ledgerService.recordRideEarnings(ride);
 *
 * 3. When delivery is completed:
 *    await ledgerService.recordDeliveryEarnings(delivery);
 *
 * 4. When vendor requests payout:
 *    await ledgerService.recordVendorPayout({ ...payout, status: 'PENDING' });
 *
 * 5. When payout is processed by bank:
 *    await ledgerService.recordVendorPayout({ ...payout, status: 'PAID' });
 *
 * 6. When admin makes adjustment:
 *    await ledgerService.recordAdjustment({
 *      entityType: 'STORE',
 *      entityId: storeId,
 *      amount: 100,
 *      reason: 'Compensation for system error',
 *      adminUserId: adminId
 *    });
 */
