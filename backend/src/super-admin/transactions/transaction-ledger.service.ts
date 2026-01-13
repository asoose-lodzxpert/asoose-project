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
   * Record commission deduction and vendor earning from an order
   */
  async recordOrderCommission(order: {
    id: string;
    storeId: string;
    total: number;
    commissionRate: number;
  }) {
    const commission = order.total * (order.commissionRate / 100);
    const vendorEarning = order.total - commission;

    // Get current vendor balance
    const store = await this.prisma.store.findUnique({
      where: { id: order.storeId },
      select: { walletBalance: true },
    });

    const currentBalance = store?.walletBalance || 0;

    // Record commission deduction
    await this.prisma.transaction.create({
      data: {
        type: 'COMMISSION_DEDUCTED',
        amount: commission,
        entityType: 'PLATFORM',
        orderId: order.id,
        description: `Platform commission (${order.commissionRate}%)`,
        status: 'COMPLETED',
        balanceBefore: 0,
        balanceAfter: 0,
        metadata: {
          storeId: order.storeId,
          commissionRate: order.commissionRate,
        },
      },
    });

    // Record vendor earning
    await this.prisma.transaction.create({
      data: {
        type: 'VENDOR_EARNING',
        amount: vendorEarning,
        entityType: 'STORE',
        entityId: order.storeId,
        orderId: order.id,
        description: 'Order earnings credited to wallet',
        status: 'COMPLETED',
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + vendorEarning,
        metadata: {
          orderTotal: order.total,
          commission: commission,
        },
      },
    });

    // Update store wallet balance
    await this.prisma.store.update({
      where: { id: order.storeId },
      data: {
        walletBalance: { increment: vendorEarning },
        totalRevenue: { increment: order.total },
      },
    });

    return { commission, vendorEarning };
  }

  /**
   * Record ride earnings (platform fee and driver fee)
   */
  async recordRideEarnings(ride: {
    id: string;
    riderId: string;
    totalFare: number;
    platformFee: number;
    driverFee: number;
  }) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: ride.riderId },
      select: { walletBalance: true },
    });

    const currentBalance = rider?.walletBalance || 0;

    // Record platform fee
    await this.prisma.transaction.create({
      data: {
        type: 'COMMISSION_DEDUCTED',
        amount: ride.platformFee,
        entityType: 'PLATFORM',
        rideId: ride.id,
        description: 'Platform fee from ride',
        status: 'COMPLETED',
        balanceBefore: 0,
        balanceAfter: 0,
        metadata: {
          riderId: ride.riderId,
          totalFare: ride.totalFare,
        },
      },
    });

    // Record rider earning
    await this.prisma.transaction.create({
      data: {
        type: 'RIDER_EARNING',
        amount: ride.driverFee,
        entityType: 'RIDER',
        entityId: ride.riderId,
        rideId: ride.id,
        description: 'Ride earnings credited to wallet',
        status: 'COMPLETED',
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + ride.driverFee,
        metadata: {
          totalFare: ride.totalFare,
          platformFee: ride.platformFee,
        },
      },
    });

    // Update rider wallet balance
    await this.prisma.rider.update({
      where: { id: ride.riderId },
      data: {
        walletBalance: { increment: ride.driverFee },
      },
    });

    return { platformFee: ride.platformFee, driverFee: ride.driverFee };
  }

  /**
   * Record delivery earnings
   */
  async recordDeliveryEarnings(delivery: {
    id: string;
    riderId: string;
    deliveryFee: number;
  }) {
    const platformFee = delivery.deliveryFee * 0.15; // 15% platform fee
    const riderEarning = delivery.deliveryFee - platformFee;

    const rider = await this.prisma.rider.findUnique({
      where: { id: delivery.riderId },
      select: { walletBalance: true },
    });

    const currentBalance = rider?.walletBalance || 0;

    // Record platform fee
    await this.prisma.transaction.create({
      data: {
        type: 'COMMISSION_DEDUCTED',
        amount: platformFee,
        entityType: 'PLATFORM',
        deliveryId: delivery.id,
        description: 'Platform fee from delivery',
        status: 'COMPLETED',
        balanceBefore: 0,
        balanceAfter: 0,
      },
    });

    // Record rider earning
    await this.prisma.transaction.create({
      data: {
        type: 'RIDER_EARNING',
        amount: riderEarning,
        entityType: 'RIDER',
        entityId: delivery.riderId,
        deliveryId: delivery.id,
        description: 'Delivery earnings credited to wallet',
        status: 'COMPLETED',
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + riderEarning,
      },
    });

    // Update rider wallet balance
    await this.prisma.rider.update({
      where: { id: delivery.riderId },
      data: {
        walletBalance: { increment: riderEarning },
      },
    });

    return { platformFee, riderEarning };
  }

  /**
   * Record vendor payout request and completion
   */
  async recordVendorPayout(payout: {
    id: string;
    storeId: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'FAILED';
    reference?: string;
  }) {
    const store = await this.prisma.store.findUnique({
      where: { id: payout.storeId },
      select: { walletBalance: true },
    });

    const currentBalance = store?.walletBalance || 0;

    // If payout is requested (PENDING)
    if (payout.status === 'PENDING') {
      return this.prisma.transaction.create({
        data: {
          type: 'PAYOUT_REQUESTED',
          amount: payout.amount,
          entityType: 'STORE',
          entityId: payout.storeId,
          vendorPayoutId: payout.id,
          description: 'Payout requested',
          status: 'PENDING',
          balanceBefore: currentBalance,
          balanceAfter: currentBalance, // Balance not deducted until PAID
          metadata: {
            reference: payout.reference,
          },
        },
      });
    }

    // If payout is completed (PAID)
    if (payout.status === 'PAID') {
      // Update previous transaction to COMPLETED
      await this.prisma.transaction.updateMany({
        where: {
          vendorPayoutId: payout.id,
          type: 'PAYOUT_REQUESTED',
        },
        data: { status: 'COMPLETED' },
      });

      // Create payout completed transaction
      await this.prisma.transaction.create({
        data: {
          type: 'PAYOUT_COMPLETED',
          amount: payout.amount,
          entityType: 'STORE',
          entityId: payout.storeId,
          vendorPayoutId: payout.id,
          description: 'Payout transferred to bank',
          status: 'COMPLETED',
          balanceBefore: currentBalance,
          balanceAfter: currentBalance - payout.amount,
          metadata: {
            reference: payout.reference,
          },
        },
      });

      // Deduct from store wallet
      await this.prisma.store.update({
        where: { id: payout.storeId },
        data: {
          walletBalance: { decrement: payout.amount },
        },
      });
    }

    // If payout failed
    if (payout.status === 'FAILED') {
      await this.prisma.transaction.updateMany({
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
  }

  /**
   * Record rider payout
   */
  async recordRiderPayout(payout: {
    id: string;
    riderId: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'FAILED';
    reference?: string;
  }) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: payout.riderId },
      select: { walletBalance: true },
    });

    const currentBalance = rider?.walletBalance || 0;

    if (payout.status === 'PENDING') {
      return this.prisma.transaction.create({
        data: {
          type: 'PAYOUT_REQUESTED',
          amount: payout.amount,
          entityType: 'RIDER',
          entityId: payout.riderId,
          riderPayoutId: payout.id,
          description: 'Payout requested',
          status: 'PENDING',
          balanceBefore: currentBalance,
          balanceAfter: currentBalance,
          metadata: {
            reference: payout.reference,
          },
        },
      });
    }

    if (payout.status === 'PAID') {
      await this.prisma.transaction.updateMany({
        where: {
          riderPayoutId: payout.id,
          type: 'PAYOUT_REQUESTED',
        },
        data: { status: 'COMPLETED' },
      });

      await this.prisma.transaction.create({
        data: {
          type: 'PAYOUT_COMPLETED',
          amount: payout.amount,
          entityType: 'RIDER',
          entityId: payout.riderId,
          riderPayoutId: payout.id,
          description: 'Payout transferred to bank',
          status: 'COMPLETED',
          balanceBefore: currentBalance,
          balanceAfter: currentBalance - payout.amount,
          metadata: {
            reference: payout.reference,
          },
        },
      });

      await this.prisma.rider.update({
        where: { id: payout.riderId },
        data: {
          walletBalance: { decrement: payout.amount },
        },
      });
    }

    if (payout.status === 'FAILED') {
      await this.prisma.transaction.updateMany({
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
