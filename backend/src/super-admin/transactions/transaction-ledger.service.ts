import { PrismaService } from '../../prisma/prisma.service';
import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, UserRole, TransactionType } from '@prisma/client';

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

      return client.transaction.upsert({
        where: { paymentId: payment.id },
        create: {
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
        // Synchronize on update to handle late transitions (e.g. PENDING -> COMPLETED)
        update: {
          status: payment.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
          amount: payment.amount,
          description,
          orderId: payment.orderId,
          rideId: payment.rideId,
          orderGroupId: payment.orderGroupId,
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
    externalTx?: Prisma.TransactionClient,
  ) {
    return this.withTransaction(async (tx) => {
      // 1. Fetch current wallet balance for accurate ledger snapshot
      let balanceBefore = 0;
      if (userRole === UserRole.RIDER) {
        const rider = await tx.rider.findUnique({
          where: { id: userId },
          select: { walletBalance: true },
        });
        balanceBefore = rider?.walletBalance ?? 0;
      } else {
        const store = await tx.store.findFirst({
          where: { vendorId: userId },
          select: { walletBalance: true },
        });
        balanceBefore = store?.walletBalance ?? 0;
      }
      const balanceAfter = balanceBefore - amount;

      // 2. Create Ledger Entry (Audit Trail)
      const transaction = await tx.transaction.create({
        data: {
          amount: amount,
          type: 'PAYOUT_REQUESTED',
          status: 'PENDING',
          description: `Withdrawal Request (Funds Locked)`,

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
          balanceBefore,
          balanceAfter,
        },
      });

      // 3. DEBIT the Wallet (The ONLY Debit action in the lifecycle)
      if (userRole === UserRole.RIDER) {
        const updatedRider = await tx.rider.update({
          where: { id: userId },
          data: { walletBalance: { decrement: amount } },
          select: { walletBalance: true }
        });
        if (updatedRider.walletBalance < 0) {
          throw new BadRequestException('Insufficient balance. Please wait for previous transactions to clear.');
        }
      } else {
        // For Vendors, usually the Vendor ID is passed, but we update the STORE wallet
        const updatedStore = await tx.store.update({
          where: { vendorId: userId },
          data: { walletBalance: { decrement: amount } },
          select: { walletBalance: true }
        });
        if (updatedStore.walletBalance < 0) {
          throw new BadRequestException('Insufficient balance. Please wait for previous transactions to clear.');
        }
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
  /**
   * Finalizes a payout after admin approval/rejection or a gateway result.
   *
   * @param externalTx - Pass the caller's Prisma transaction client to make
   *   the ledger write and the payout status update fully atomic. If omitted,
   *   the method opens its own transaction — but this breaks atomicity when the
   *   caller is already inside a $transaction block.
   */
  async finalizePayout(
    payoutId: string,
    status: 'COMPLETED' | 'FAILED',
    externalTx?: Prisma.TransactionClient,
  ) {
    return this.withTransaction(async (client) => {
      // Common WHERE clause using OR to find by either ID type
      const whereClause: Prisma.TransactionWhereInput = {
        OR: [{ riderPayoutId: payoutId }, { vendorPayoutId: payoutId }],
        type: 'PAYOUT_REQUESTED',
      };

      if (status === 'COMPLETED') {
        // SUCCESS: Mark the PAYOUT_REQUESTED entry as COMPLETED.
        // Wallet was already debited at request time — no further debit here.
        await client.transaction.updateMany({
          where: whereClause,
          data: { status: 'COMPLETED', description: 'Withdrawal Successful' },
        });
      } else {
        // FAILED/REJECTED: Refund the wallet and mark ledger as FAILED.

        // 1. Find the original PAYOUT_REQUESTED entry (required for refund amount + entity)
        const originalTx = await client.transaction.findFirst({
          where: whereClause,
        });

        if (!originalTx) {
          // Hard fail — we cannot refund without knowing the amount and entity.
          // A silent skip here would silently lose money.
          throw new Error(
            `finalizePayout: No PAYOUT_REQUESTED ledger entry found for payout ${payoutId}. ` +
              `Wallet refund aborted. Manual review required.`,
          );
        }

        // 2. Mark original request as FAILED in ledger
        await client.transaction.update({
          where: { id: originalTx.id },
          data: {
            status: 'FAILED',
            description: 'Withdrawal Failed - Funds Returned to Wallet',
          },
        });

        // 3. Credit (refund) the wallet
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

        // 4. Create a PAYOUT_FAILED credit entry for strict audit trail
        await client.transaction.create({
          data: {
            type: 'PAYOUT_FAILED',
            amount: originalTx.amount,
            entityType: originalTx.entityType,
            entityId: originalTx.entityId,
            riderPayoutId: originalTx.riderPayoutId,
            vendorPayoutId: originalTx.vendorPayoutId,
            description: 'Wallet refund for failed/rejected payout',
            status: 'COMPLETED',
            balanceBefore: 0,
            balanceAfter: 0,
          },
        });
      }
    }, externalTx);
  }

  /**
   * Records that an admin approved a payout (PENDING → APPROVED status transition).
   * Call this inside the same $transaction block that updates the payout status so
   * both writes commit or roll back together.
   */
  async recordPayoutApproved(
    payoutId: string,
    type: 'VENDOR' | 'RIDER',
    amount: number,
    adminId: string,
    externalTx?: Prisma.TransactionClient,
  ) {
    return this.withTransaction(async (client) => {
      await client.transaction.create({
        data: {
          type: TransactionType.PAYOUT_APPROVED,
          amount,
          entityType: type === 'VENDOR' ? 'STORE' : 'RIDER',
          ...(type === 'VENDOR'
            ? { vendorPayoutId: payoutId }
            : { riderPayoutId: payoutId }),
          description: 'Payout approved by admin — awaiting bank transfer',
          status: 'COMPLETED',
          processedBy: adminId,
          balanceBefore: 0,
          balanceAfter: 0,
          metadata: { approvedBy: adminId, payoutId },
        },
      });
    }, externalTx);
  }

  /**
   * Records a payment-gateway error that occurred during payout disbursement.
   * Best-effort: never throws, so a logging failure never blocks the caller's
   * error response to the admin.
   */
  async recordGatewayError(
    payoutId: string,
    type: 'VENDOR' | 'RIDER',
    adminId: string,
    errorMessage: string,
  ) {
    try {
      await this.prisma.transaction.create({
        data: {
          type: TransactionType.PAYOUT_GATEWAY_ERROR,
          amount: 0,
          entityType: type === 'VENDOR' ? 'STORE' : 'RIDER',
          ...(type === 'VENDOR'
            ? { vendorPayoutId: payoutId }
            : { riderPayoutId: payoutId }),
          description: 'Payment gateway error during payout disbursement',
          status: 'FAILED',
          processedBy: adminId,
          balanceBefore: 0,
          balanceAfter: 0,
          metadata: {
            payoutId,
            errorMessage,
            requiresManualReview: true,
          },
        },
      });
    } catch (e) {
      // Intentional no-op: logging must never throw and block the API response.
    }
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
      // Idempotency guard: skip if earnings for this order already recorded
      const existing = await client.transaction.findFirst({
        where: { type: 'VENDOR_EARNING', orderId: order.id },
        select: { id: true },
      });
      if (existing) return { vendorEarning };

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
    const riderEarning = ride.driverFee;

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
      // Idempotency guard: skip if earnings for this delivery already recorded
      const existing = await client.transaction.findFirst({
        where: { type: 'RIDER_EARNING', deliveryId: delivery.id },
        select: { id: true },
      });
      if (existing) return { riderEarning };

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

      if (payout.status === 'PAID') {
        await client.transaction.updateMany({
          where: { vendorPayoutId: payout.id, type: 'PAYOUT_REQUESTED' },
          data: { status: 'COMPLETED' },
        });

        await client.transaction.create({
          data: {
            type: 'COMMISSION_DEDUCTED',
            amount: commission,
            entityType: 'PLATFORM',
            entityId: payout.storeId,
            vendorPayoutId: payout.id,
            description: `Commission deducted (${commissionRate}%)`,
            status: 'COMPLETED',
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - commission,
            metadata: {
              reference: payout.reference,
              commissionRate,
              commission,
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
            description: `Payout completed (net after ${commissionRate}% commission)`,
            status: 'COMPLETED',
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - payout.amount,
            metadata: {
              reference: payout.reference,
              commissionRate,
              commission,
              netPayout,
            },
          },
        });

        await client.store.update({
          where: { id: payout.storeId },
          data: { walletBalance: { decrement: payout.amount } },
        });

        return;
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
        payout.commissionRate ?? rider?.commissionRate ?? 10;
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
          where: { riderPayoutId: payout.id, type: 'PAYOUT_REQUESTED' },
          data: { status: 'COMPLETED' },
        });

        await client.transaction.create({
          data: {
            type: 'COMMISSION_DEDUCTED',
            amount: commission,
            entityType: 'PLATFORM',
            entityId: payout.riderId,
            riderPayoutId: payout.id,
            description: `Commission deducted (${commissionRate}%)`,
            status: 'COMPLETED',
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - commission,
            metadata: {
              reference: payout.reference,
              commissionRate,
              commission,
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
            description: `Payout completed (net after ${commissionRate}% commission)`,
            status: 'COMPLETED',
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - payout.amount,
            metadata: {
              reference: payout.reference,
              commissionRate,
              commission,
              netPayout,
            },
          },
        });

        await client.rider.update({
          where: { id: payout.riderId },
          data: { walletBalance: { decrement: payout.amount } },
        });

        return;
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
