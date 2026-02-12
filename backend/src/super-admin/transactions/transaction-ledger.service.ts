import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Transaction Ledger Helper
 * Use these functions to record transactions whenever money moves in the system
 */

@Injectable()
export class TransactionLedgerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper to execute logic within an existing transaction or create a new one.
   */
  private async withTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
    externalTx?: Prisma.TransactionClient,
  ): Promise<T> {
    if (externalTx) {
      return callback(externalTx);
    }
    return this.prisma.$transaction(callback);
  }

  /**
   * Record a payment from customer (order or ride)
   * FIXED: Added orderGroupId and description to the type definition
   */
  async recordPayment(
    payment: {
      id: string;
      amount: number;
      userId: string;
      orderId?: string;
      rideId?: string;
      orderGroupId?: string; // <--- NEW FIELD
      method: string;
      status: string;
      description?: string; // <--- NEW FIELD
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.withTransaction(async (client) => {
      // Logic to determine description if not provided
      let description = payment.description;

      if (!description) {
        if (payment.orderGroupId) {
          description = `Payment for Order Group #${payment.orderGroupId}`;
        } else if (payment.orderId) {
          description = 'Payment for order';
        } else if (payment.rideId) {
          description = 'Payment for ride';
        } else {
          description = 'Wallet top-up';
        }
      }

      return client.transaction.create({
        data: {
          type: 'PAYMENT_RECEIVED',
          amount: payment.amount,
          paymentId: payment.id,
          orderId: payment.orderId,
          rideId: payment.rideId,
          orderGroupId: payment.orderGroupId, // <--- MAP TO DB
          description,
          status: payment.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
          balanceBefore: 0, // Platform balance (if tracking)
          balanceAfter: 0,
          metadata: {
            method: payment.method,
            userId: payment.userId,
            ...(payment.orderGroupId && { orderGroupId: payment.orderGroupId }),
          },
        },
      });
    }, tx);
  }

  // ... (Keep the rest of the existing methods: recordOrderCommission, recordRideEarnings, etc.)

  /**
   * Record vendor earning from an order
   * Note: Commission is deducted later during withdrawal, not here
   */
  async recordOrderCommission(
    order: {
      id: string;
      storeId: string;
      total: number;
      commissionRate: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const vendorEarning = order.total;

    return this.withTransaction(async (client) => {
      // Get current vendor balance
      const store = await client.store.findUnique({
        where: { id: order.storeId },
        select: { walletBalance: true },
      });

      const currentBalance = store?.walletBalance || 0;

      // Record vendor earning (full amount)
      await client.transaction.create({
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
      await client.store.update({
        where: { id: order.storeId },
        data: {
          walletBalance: { increment: vendorEarning },
          totalRevenue: { increment: order.total },
        },
      });

      return { vendorEarning };
    }, tx);
  }

  /**
   * Record ride earnings
   */
  async recordRideEarnings(
    ride: {
      id: string;
      riderId: string;
      totalFare: number;
      platformFee: number;
      driverFee: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const riderEarning = ride.totalFare;

    return this.withTransaction(async (client) => {
      const rider = await client.rider.findUnique({
        where: { id: ride.riderId },
        select: { walletBalance: true },
      });

      const currentBalance = rider?.walletBalance || 0;

      await client.transaction.create({
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

      await client.rider.update({
        where: { id: ride.riderId },
        data: {
          walletBalance: { increment: riderEarning },
        },
      });

      return { riderEarning };
    }, tx);
  }

  // ... (Include recordDeliveryEarnings, recordVendorPayout, recordRiderPayout, recordRefund, recordAdjustment methods here as they were)

  async recordDeliveryEarnings(
    delivery: {
      id: string;
      riderId: string;
      deliveryFee: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const riderEarning = delivery.deliveryFee;

    return this.withTransaction(async (client) => {
      const rider = await client.rider.findUnique({
        where: { id: delivery.riderId },
        select: { walletBalance: true },
      });

      const currentBalance = rider?.walletBalance || 0;

      await client.transaction.create({
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

      await client.rider.update({
        where: { id: delivery.riderId },
        data: {
          walletBalance: { increment: riderEarning },
        },
      });

      return { riderEarning };
    }, tx);
  }

  async recordVendorPayout(
    payout: {
      id: string;
      storeId: string;
      amount: number;
      status: 'PENDING' | 'PAID' | 'FAILED';
      reference?: string;
      commissionRate?: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.withTransaction(async (client) => {
      const store = await client.store.findUnique({
        where: { id: payout.storeId },
        select: { walletBalance: true, commissionRate: true },
      });

      const currentBalance = store?.walletBalance || 0;

      const commissionRate =
        payout.commissionRate ?? store?.commissionRate ?? 10;
      const commission = payout.amount * (commissionRate / 100);
      const netPayout = payout.amount - commission;

      if (payout.status === 'PENDING') {
        return client.transaction.create({
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
        await client.transaction.updateMany({
          where: {
            vendorPayoutId: payout.id,
            type: 'PAYOUT_REQUESTED',
          },
          data: { status: 'COMPLETED' },
        });

        await client.transaction.create({
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

        await client.transaction.create({
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

        await client.store.update({
          where: { id: payout.storeId },
          data: {
            walletBalance: { decrement: payout.amount },
          },
        });
      }

      if (payout.status === 'FAILED') {
        await client.transaction.updateMany({
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
    }, tx);
  }

  async recordRiderPayout(
    payout: {
      id: string;
      riderId: string;
      amount: number;
      status: 'PENDING' | 'PAID' | 'FAILED';
      reference?: string;
      commissionRate?: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.withTransaction(async (client) => {
      const rider = await client.rider.findUnique({
        where: { id: payout.riderId },
        select: { walletBalance: true, commissionRate: true },
      });

      const currentBalance = rider?.walletBalance || 0;
      const commissionRate =
        payout.commissionRate ?? rider?.commissionRate ?? 20;
      const commission = payout.amount * (commissionRate / 100);
      const netPayout = payout.amount - commission;

      if (payout.status === 'PENDING') {
        return client.transaction.create({
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
        await client.transaction.updateMany({
          where: {
            riderPayoutId: payout.id,
            type: 'PAYOUT_REQUESTED',
          },
          data: { status: 'COMPLETED' },
        });

        await client.transaction.create({
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

        await client.transaction.create({
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

        await client.rider.update({
          where: { id: payout.riderId },
          data: {
            walletBalance: { decrement: payout.amount },
          },
        });
      }

      if (payout.status === 'FAILED') {
        await client.transaction.updateMany({
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
    }, tx);
  }

  async recordRefund(
    payment: {
      id: string;
      amount: number;
      userId: string;
      orderId?: string;
      rideId?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.withTransaction(async (client) => {
      return client.transaction.create({
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
    }, tx);
  }

  async recordAdjustment(
    data: {
      entityType: 'STORE' | 'RIDER';
      entityId: string;
      amount: number;
      reason: string;
      adminUserId: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.withTransaction(async (client) => {
      let currentBalance = 0;

      if (data.entityType === 'STORE') {
        const store = await client.store.findUnique({
          where: { id: data.entityId },
          select: { walletBalance: true },
        });
        currentBalance = store?.walletBalance || 0;

        await client.store.update({
          where: { id: data.entityId },
          data: {
            walletBalance: { increment: data.amount },
          },
        });
      } else {
        const rider = await client.rider.findUnique({
          where: { id: data.entityId },
          select: { walletBalance: true },
        });
        currentBalance = rider?.walletBalance || 0;

        await client.rider.update({
          where: { id: data.entityId },
          data: {
            walletBalance: { increment: data.amount },
          },
        });
      }

      return client.transaction.create({
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
    }, tx);
  }
}
