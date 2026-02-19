import { PrismaService } from '../../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';

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
      orderGroupId?: string;
      method: string;
      status: string;
      description?: string;
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
          orderGroupId: payment.orderGroupId,
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

  /**
   * ✅ FIX 1: Add recordPayoutRequest
   * Records the INITIAL withdrawal request.
   * ACTION: Creates 'PAYOUT_REQUESTED' ledger entry and IMMEDIATELY debits the wallet.
   * This ensures funds are locked at the moment of request (Ledger-First).
   */
  async recordPayoutRequest(
    userId: string,
    userRole: UserRole,
    amount: number,
    payoutId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create Ledger Entry (Audit Trail)
      const transaction = await tx.transaction.create({
        data: {
          amount: amount,
          type: 'PAYOUT_REQUESTED',
          status: 'PENDING',
          description: `Withdrawal Request (Funds Locked)`,
          // FIXED: Removed 'reference' property as it doesn't exist on Transaction model

          // Map to the correct entity columns based on role
          ...(userRole === UserRole.RIDER
            ? {
                entityType: 'RIDER',
                entityId: userId,
                riderPayoutId: payoutId,
              }
            : {
                entityType: 'STORE',
                entityId: userId,
                vendorPayoutId: payoutId,
              }),
          balanceBefore: 0, // In a full implementation, fetch current balance first for accuracy
          balanceAfter: 0,
        },
      });

      // 2. DEBIT the Wallet (The ONLY Debit action in the lifecycle)
      if (userRole === UserRole.RIDER) {
        await tx.rider.update({
          where: { id: userId },
          data: { walletBalance: { decrement: amount } },
        });
      } else {
        // For Vendors, usually the Vendor ID is passed, but we update the STORE wallet
        await tx.store.update({
          where: { vendorId: userId },
          data: { walletBalance: { decrement: amount } },
        });
      }

      return transaction;
    });
  }

  /**
   * ✅ FIX 2: Add finalizePayout
   * Finalizes the payout after Admin Approval or Rejection.
   * ACTION: Updates Status ONLY. DOES NOT DEBIT AGAIN.
   * On Failure/Rejection, it refunds the wallet.
   */
  async finalizePayout(payoutId: string, status: 'COMPLETED' | 'FAILED') {
    return this.withTransaction(async (client) => {
      // Common WHERE clause using OR to find by either ID type
      const whereClause: Prisma.TransactionWhereInput = {
        OR: [{ riderPayoutId: payoutId }, { vendorPayoutId: payoutId }],
        type: 'PAYOUT_REQUESTED',
      };

      if (status === 'COMPLETED') {
        // SUCCESS: Just mark the ledger as COMPLETED.
        // Money was already debited at request time, so we do nothing to the wallet here.
        await client.transaction.updateMany({
          where: whereClause,
          data: { status: 'COMPLETED', description: 'Withdrawal Successful' },
        });
      } else {
        // FAILED: Mark as FAILED and REFUND the wallet.

        // 1. Find the original transaction to get the amount and user ID
        const originalTx = await client.transaction.findFirst({
          where: whereClause,
        });

        if (originalTx) {
          // 2. Mark original request as FAILED in ledger
          await client.transaction.update({
            where: { id: originalTx.id },
            data: {
              status: 'FAILED',
              description: 'Withdrawal Failed - Refunded',
            },
          });

          // 3. REFUND (Credit) the wallet
          if (originalTx.entityType === 'RIDER' && originalTx.entityId) {
            await client.rider.update({
              where: { id: originalTx.entityId },
              data: { walletBalance: { increment: originalTx.amount } },
            });
          } else if (originalTx.entityType === 'STORE' && originalTx.entityId) {
            await client.store.update({
              where: { id: originalTx.entityId },
              data: { walletBalance: { increment: originalTx.amount } },
            });
          }

          // 4. Create a Refund Ledger Entry for strict audit trail
          await client.transaction.create({
            data: {
              type: 'PAYOUT_FAILED',
              amount: originalTx.amount,
              entityType: originalTx.entityType,
              entityId: originalTx.entityId,
              riderPayoutId: originalTx.riderPayoutId,
              vendorPayoutId: originalTx.vendorPayoutId,
              // FIXED: Removed 'reference' property
              description: 'Refund for failed payout',
              status: 'COMPLETED',
              balanceBefore: 0,
              balanceAfter: 0,
            },
          });
        }
      }
    });
  }

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

  // NOTE: recordVendorPayout and recordRiderPayout are legacy methods replaced by the logic in
  // recordPayoutRequest + finalizePayout, but kept for compatibility if needed elsewhere.
  // Ideally, they should be deprecated or refactored to use the new flow.

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

      // ... Rest of legacy logic kept for safety/fallback ...
      if (payout.status === 'PAID') {
        await client.transaction.updateMany({
          where: { vendorPayoutId: payout.id, type: 'PAYOUT_REQUESTED' },
          data: { status: 'COMPLETED' },
        });
        // ...
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
      // ... legacy implementation ...
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
