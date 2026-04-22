import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import {
  AdjustWalletDto,
  AdjustmentType,
  WalletTargetType,
} from './dto/adjust-wallet.dto';

import {
  TransactionType,
  TransactionStatus,
  WalletEntityType,
  Prisma,
} from '@prisma/client';
import { PaymentService } from 'src/payment/payment.service';
import { PaymentGateway } from 'src/payment/enums/payment.enums';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
  ) {}

  /**
   * Get all transactions with filters and pagination
   * ✅ FIX: Updated to include OrderGroup relations
   */
  async findAll(query: TransactionFilterDto) {
    const { search, status, type, from, to, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    // Date Filter
    const dateFilter =
      from || to
        ? {
            createdAt: {
              ...(from && {
                gte: new Date(new Date(from).setHours(0, 0, 0, 0)),
              }),
              ...(to && {
                lte: new Date(new Date(to).setHours(23, 59, 59, 999)),
              }),
            },
          }
        : {};

    // Build WHERE clause for search
    const searchFilter: Prisma.TransactionWhereInput = search
      ? {
          OR: [
            { id: { contains: search, mode: 'insensitive' } },
            {
              payment: {
                transactionId: { contains: search, mode: 'insensitive' },
              },
            },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    // Build status filter
    const statusFilterClause: Prisma.TransactionWhereInput =
      status && status !== 'All'
        ? { status: this.mapFrontendStatusToDb(status) as TransactionStatus }
        : {};

    // Build type filter
    const typeFilterClause: Prisma.TransactionWhereInput =
      type && type !== 'All'
        ? {
            type: {
              in: this.getTransactionTypesByFilter(type) as TransactionType[],
            },
          }
        : {};

    // Fetch transactions from unified ledger
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          ...dateFilter,
          ...searchFilter,
          ...statusFilterClause,
          ...typeFilterClause,
        },
        include: {
          payment: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              // ✅ FIX: Include Direct Order relation
              order: {
                include: {
                  store: { select: { name: true } },
                },
              },
              // ✅ FIX: Include Multi-Vendor Order Group relation
              orderGroup: {
                include: {
                  orders: {
                    include: {
                      store: { select: { name: true } },
                    },
                  },
                },
              },
              ride: { select: { id: true } },
            },
          },
          vendorPayout: {
            include: {
              store: {
                select: {
                  name: true,
                  vendor: { select: { name: true, email: true } },
                },
              },
            },
          },
          riderPayout: {
            include: {
              rider: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                  vehicle: { select: { plateNumber: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.transaction.count({
        where: {
          ...dateFilter,
          ...searchFilter,
          ...statusFilterClause,
          ...typeFilterClause,
        },
      }),
    ]);

    // Calculate stats
    const stats = await this.calculateStats(dateFilter);

    return {
      data: transactions.map(this.transformTransactionListItem),
      stats,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  /**
   * Get single transaction detail
   * ✅ FIX: Updated to fetch OrderGroup details for multi-cart transactions
   */
  async findOne(id: string) {
    const t = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        payment: {
          include: {
            user: true,
            // 1. Single Order Context
            order: {
              include: {
                store: {
                  include: { bankAccount: true },
                },
                items: {
                  include: {
                    product: { select: { name: true, images: true } },
                  },
                },
                delivery: {
                  select: {
                    id: true,
                    deliveryFee: true,
                    status: true,
                  },
                },
              },
            },
            // 2. Multi-Vendor Group Context
            orderGroup: {
              include: {
                orders: {
                  include: {
                    store: {
                      select: {
                        name: true,
                        address: true,
                        commissionRate: true,
                      },
                    },
                    items: {
                      include: {
                        product: { select: { name: true, images: true } },
                      },
                    },
                    delivery: {
                      select: {
                        id: true,
                        deliveryFee: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
            // 3. Ride Context
            ride: {
              include: {
                pickupAddress: true,
                dropoffAddress: true,
                customer: { select: { name: true, email: true, phone: true } },
                rider: {
                  include: { vehicle: true },
                },
              },
            },
          },
        },
        vendorPayout: {
          include: {
            store: {
              include: {
                vendor: true,
                bankAccount: true,
                orders: {
                  where: {
                    createdAt: {
                      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                    status: 'DELIVERED',
                  },
                  select: { id: true, total: true },
                },
              },
            },
          },
        },
        riderPayout: {
          include: {
            rider: {
              include: {
                vehicle: true,
                rides: {
                  where: {
                    status: 'COMPLETED',
                    createdAt: {
                      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                  },
                  select: { id: true, totalFare: true, distanceKm: true },
                },
                deliveries: {
                  where: {
                    status: 'DELIVERED',
                    createdAt: {
                      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                  },
                  select: { id: true, deliveryFee: true, distanceKm: true },
                },
              },
            },
          },
        },
      },
    });

    if (!t) {
      throw new NotFoundException('Transaction not found');
    }

    return this.transformTransactionDetail(t);
  }

  /**
   * Create transaction record (called internally)
   */
  async createTransaction(data: {
    type: string;
    amount: number;
    entityType?: string;
    entityId?: string;
    paymentId?: string;
    vendorPayoutId?: string;
    riderPayoutId?: string;
    orderId?: string;
    rideId?: string;
    deliveryId?: string;
    description: string;
    metadata?: any;
    balanceBefore: number;
    balanceAfter: number;
    status?: string;
    processedBy?: string;
  }) {
    const createData: Prisma.TransactionUncheckedCreateInput = {
      type: data.type as TransactionType,
      amount: data.amount,
      description: data.description,
      balanceBefore: data.balanceBefore,
      balanceAfter: data.balanceAfter,
      status: (data.status as TransactionStatus) || TransactionStatus.COMPLETED,
      metadata: data.metadata || {},

      entityType: data.entityType
        ? (data.entityType as WalletEntityType)
        : null,
      entityId: data.entityId || null,

      paymentId: data.paymentId || null,
      vendorPayoutId: data.vendorPayoutId || null,
      riderPayoutId: data.riderPayoutId || null,
      orderId: data.orderId || null,
      rideId: data.rideId || null,
      deliveryId: data.deliveryId || null,
      processedBy: data.processedBy || null,
    };

    return this.prisma.transaction.create({
      data: createData,
    });
  }

  /**
   * Get wallet transaction history for an entity
   */
  async getWalletHistory(
    entityType: 'STORE' | 'RIDER',
    entityId: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          entityType: entityType as any,
          entityId,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({
        where: {
          entityType: entityType as any,
          entityId,
        },
      }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async calculateStats(dateFilter: any) {
    const [paymentsCompleted, paymentsRefunded, vendorPayouts, riderPayouts] =
      await Promise.all([
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            type: { in: ['PAYMENT_RECEIVED', 'WALLET_TOPUP'] },
            status: 'COMPLETED',
            ...dateFilter,
          },
        }),
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            type: 'REFUND_ISSUED',
            status: 'COMPLETED',
            ...dateFilter,
          },
        }),
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            type: 'PAYOUT_COMPLETED',
            entityType: 'STORE',
            status: 'COMPLETED',
            ...dateFilter,
          },
        }),
        this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            type: 'PAYOUT_COMPLETED',
            entityType: 'RIDER',
            status: 'COMPLETED',
            ...dateFilter,
          },
        }),
      ]);

    const revenue = paymentsCompleted._sum.amount || 0;
    const refunds = paymentsRefunded._sum.amount || 0;
    const payouts =
      (vendorPayouts._sum.amount || 0) + (riderPayouts._sum.amount || 0);

    return {
      revenue,
      refunds,
      payouts,
      net: revenue - refunds - payouts,
    };
  }

  private mapFrontendStatusToDb(status: string): string {
    const map = {
      Success: 'COMPLETED',
      Processing: 'PENDING',
      Failed: 'FAILED',
      Refunded: 'REVERSED',
    };
    return map[status] || status;
  }

  private getTransactionTypesByFilter(filter: string): string[] {
    if (filter === 'Credit') {
      return [
        'PAYMENT_RECEIVED',
        'WALLET_TOPUP',
        'VENDOR_EARNING',
        'RIDER_EARNING',
        'ADJUSTMENT',
      ];
    }
    if (filter === 'Debit') {
      return [
        'COMMISSION_DEDUCTED',
        'PAYOUT_REQUESTED',
        'PAYOUT_COMPLETED',
        'REFUND_ISSUED',
      ];
    }
    return [];
  }

  private transformTransactionListItem = (t: any) => {
    const isCredit = [
      'PAYMENT_RECEIVED',
      'WALLET_TOPUP',
      'VENDOR_EARNING',
      'RIDER_EARNING',
      'ADJUSTMENT',
    ].includes(t.type);

    let userName = 'System';
    let userEmail = null;

    if (t.payment?.user) {
      userName = t.payment.user.name;
      userEmail = t.payment.user.email;
    } else if (t.vendorPayout?.store) {
      userName = t.vendorPayout.store.name;
      userEmail = t.vendorPayout.store.owner?.email;
    } else if (t.riderPayout?.rider) {
      userName = t.riderPayout.rider.name;
      userEmail = t.riderPayout.rider.email;
    }

    // Determine reference
    let refId: string | null = null;
    let refType: string | null = null;

    // ✅ FIX: Order Resolution
    if (t.orderId) {
      refId = t.orderId;
      refType = 'Order';
    } else if (t.payment?.order) {
      refId = t.payment.order.id;
      refType = 'Order';
    } else if (t.payment?.orderGroup) {
      // ✅ FIX: Handle Multi-Vendor Group Reference
      refId = t.payment.orderGroup.id;
      refType = 'OrderGroup';
    } else if (t.rideId) {
      refId = t.rideId;
      refType = 'Ride';
    } else if (t.deliveryId) {
      refId = t.deliveryId;
      refType = 'Delivery';
    }

    // Generate descriptive text for grouped orders
    let description = t.description;
    if (refType === 'OrderGroup' && t.payment?.orderGroup) {
      const storeCount = t.payment.orderGroup.orders?.length || 0;
      description = `Multi-Vendor Checkout (${storeCount} Stores)`;
    }

    return {
      id: t.id,
      type: isCredit ? 'Credit' : 'Debit',
      amount: `${isCredit ? '+' : '-'}$${Math.abs(t.amount).toFixed(2)}`,
      desc: description,
      method: t.payment?.method || 'BANK_TRANSFER',
      refId,
      refType,
      user: userName,
      userEmail,
      date: t.createdAt.toISOString(),
      status: this.mapDbStatusToFrontend(t.status),
      transactionType: t.type,
    };
  };

  private transformTransactionDetail(t: any) {
    const detail: any = {
      id: t.id,
      status: this.mapDbStatusToFrontend(t.status),
      amount: t.amount,
      type: this.formatTransactionType(t.type),
      method:
        t.payment?.method ||
        t.vendorPayout?.method ||
        t.riderPayout?.method ||
        'WALLET',
      date: t.createdAt,
      reference:
        t.payment?.transactionId ||
        t.vendorPayout?.reference ||
        t.riderPayout?.reference ||
        `REF-${t.id.slice(0, 8).toUpperCase()}`,
      description: t.description,
      balanceBefore: t.balanceBefore,
      balanceAfter: t.balanceAfter,
      metadata: t.metadata,
      timeline: this.buildTimeline(t),
    };

    if (t.payment) {
      detail.customer = {
        name: t.payment.user.name,
        email: t.payment.user.email,
        phone: t.payment.user.phone,
      };

      detail.paymentInfo = {
        transactionId: t.payment.transactionId,
        paymentMethod: t.payment.method,
        status: t.payment.status,
        failureReason: t.payment.failureReason,
      };

      // ✅ FIX: Handle Single Order
      if (t.payment.order) {
        const order = t.payment.order;
        const subtotal = order.items.reduce(
          (sum, i) => sum + i.quantity * i.price,
          0,
        );
        const commission = subtotal * (order.store.commissionRate / 100);
        const deliveryFee = order.delivery?.deliveryFee || 0;

        detail.orderDetails = {
          type: 'SINGLE_ORDER',
          orderId: order.id,
          vendor: order.store.name,
          vendorAddress: order.store.address,
          commissionRate: order.store.commissionRate,
          commissionAmount: commission,
          items: order.items.map((i: any) => ({
            name: i.nameSnap,
            qty: i.quantity,
            price: i.price,
            total: i.quantity * i.price,
            image: i.product?.images?.[0] || null,
            options: i.selectedOptions,
          })),
          subtotal,
          deliveryFee,
          total: order.total,
        };

        detail.financialBreakdown = {
          customerPaid: order.total,
          platformCommission: commission,
          deliveryFee,
          vendorReceives: subtotal - commission,
        };
      }

      // ✅ FIX: Handle Multi-Vendor Group
      else if (t.payment.orderGroup) {
        const orders = t.payment.orderGroup.orders || [];
        const groupTotal = orders.reduce((sum, o) => sum + o.total, 0);
        const totalDeliveryFees = orders.reduce(
          (sum, o) => sum + (o.delivery?.deliveryFee || 0),
          0,
        );

        // Aggregate items from all stores
        const allItems = orders.flatMap((o) =>
          o.items.map((i) => ({
            storeName: o.store.name,
            name: i.nameSnap,
            qty: i.quantity,
            price: i.price,
            total: i.quantity * i.price,
            image: i.product?.images?.[0] || null,
            options: i.selectedOptions,
          })),
        );

        detail.orderDetails = {
          type: 'GROUP_ORDER',
          groupId: t.payment.orderGroup.id,
          vendor: 'Multi-Vendor',
          subOrders: orders.map((o) => ({
            orderId: o.id,
            store: o.store.name,
            total: o.total,
            commissionRate: o.store.commissionRate,
            deliveryFee: o.delivery?.deliveryFee || 0,
          })),
          items: allItems,
          totalDeliveryFees,
          total: groupTotal,
        };

        detail.financialBreakdown = {
          customerPaid: groupTotal,
          deliveryFee: totalDeliveryFees,
          note: 'Split across multiple vendors (See sub-orders)',
        };
      }

      if (t.payment.ride) {
        const ride = t.payment.ride;

        detail.rideDetails = {
          rideId: ride.id,
          driver: ride.rider?.name || 'Unassigned',
          driverPhone: ride.rider?.phone,
          vehicle: ride.rider?.vehicle
            ? `${ride.rider.vehicle.brand} ${ride.rider.vehicle.model} (${ride.rider.vehicle.plateNumber})`
            : null,
          pickup: {
            address: ride.pickupAddress.street,
            lat: ride.pickupAddress.lat,
            lng: ride.pickupAddress.lng,
          },
          dropoff: {
            address: ride.dropoffAddress.street,
            lat: ride.dropoffAddress.lat,
            lng: ride.dropoffAddress.lng,
          },
          distance: ride.distanceKm ? `${ride.distanceKm.toFixed(2)} km` : null,
          duration: ride.durationMin ? `${ride.durationMin} min` : null,
          status: ride.status,
        };

        detail.ridePricing = {
          baseFare: ride.baseFare || 0,
          distanceFare: ride.distanceFare || 0,
          timeFare: ride.timeFare || 0,
          surgeMultiplier: ride.surgeMultiplier || 1.0,
          platformFee: ride.platformFee || 0,
          driverFee: ride.driverFee || 0,
          totalFare: ride.totalFare || 0,
        };

        detail.financialBreakdown = {
          customerPaid: ride.totalFare || 0,
          platformFee: ride.platformFee || 0,
          driverReceives: ride.driverFee || 0,
        };
      }
    }

    // Vendor Payout transformation... (Kept as is)
    if (t.vendorPayout) {
      const payout = t.vendorPayout;
      detail.customer = {
        name: payout.store.name,
        email: payout.store.owner?.email,
        phone: payout.store.owner?.phone,
      };

      detail.bankInfo = payout.store.bankAccount
        ? {
            bankName: payout.store.bankAccount.bankName,
            accountNumber: payout.store.bankAccount.accountNumber,
            accountName: payout.store.bankAccount.accountName,
            currency: payout.store.bankAccount.currency,
          }
        : null;

      detail.payoutInfo = {
        reference: payout.reference,
        method: payout.method,
        status: payout.status,
        requestedAt: payout.createdAt,
        processedAt: payout.createdAt,
      };

      if (payout.store.orders) {
        const totalRevenue = payout.store.orders.reduce(
          (sum, o) => sum + o.total,
          0,
        );
        detail.recentActivity = {
          period: 'Last 30 days',
          totalOrders: payout.store.orders.length,
          totalRevenue: totalRevenue,
          averageOrderValue:
            payout.store.orders.length > 0
              ? totalRevenue / payout.store.orders.length
              : 0,
        };
      }
    }

    // Rider Payout transformation... (Kept as is)
    if (t.riderPayout) {
      const payout = t.riderPayout;
      detail.customer = {
        name: payout.rider.name,
        email: payout.rider.email,
        phone: payout.rider.phone,
      };

      detail.vehicleInfo = payout.rider.vehicle
        ? {
            type: payout.rider.vehicle.type,
            brand: payout.rider.vehicle.brand,
            model: payout.rider.vehicle.model,
            plateNumber: payout.rider.vehicle.plateNumber,
            color: payout.rider.vehicle.color,
            year: payout.rider.vehicle.year,
          }
        : null;

      detail.payoutInfo = {
        reference: payout.reference,
        method: payout.method,
        status: payout.status,
        requestedAt: payout.createdAt,
        processedAt: payout.processedAt || t.createdAt,
      };

      const rides = payout.rider.rides || [];
      const deliveries = payout.rider.deliveries || [];
      const totalRideEarnings = rides.reduce(
        (sum, r) => sum + (r.totalFare || 0),
        0,
      );
      const totalDeliveryEarnings = deliveries.reduce(
        (sum, d) => sum + d.deliveryFee,
        0,
      );
      const totalDistance =
        rides.reduce((sum, r) => sum + (r.distanceKm || 0), 0) +
        deliveries.reduce((sum, d) => sum + (d.distanceKm || 0), 0);

      detail.recentActivity = {
        period: 'Last 30 days',
        totalRides: rides.length,
        totalDeliveries: deliveries.length,
        totalTrips: rides.length + deliveries.length,
        totalEarnings: totalRideEarnings + totalDeliveryEarnings,
        totalDistance: `${totalDistance.toFixed(2)} km`,
        averageEarningPerTrip:
          rides.length + deliveries.length > 0
            ? (totalRideEarnings + totalDeliveryEarnings) /
              (rides.length + deliveries.length)
            : 0,
      };
    }

    return detail;
  }

  // ✅ FIX: Explicitly type the timeline array to allow 'note' property
  private buildTimeline(
    t: any,
  ): { status: string; date: any; done: boolean; note?: string }[] {
    const timeline: {
      status: string;
      date: any;
      done: boolean;
      note?: string;
    }[] = [{ status: 'Initiated', date: t.createdAt, done: true }];

    if (t.payment) {
      if (t.payment.status === 'COMPLETED') {
        timeline.push({
          status: 'Payment Completed',
          date: t.payment.updatedAt,
          done: true,
        });
      } else if (t.payment.status === 'FAILED') {
        timeline.push({
          status: 'Payment Failed',
          date: t.payment.updatedAt,
          done: true,
          note: t.payment.failureReason,
        });
      } else if (t.payment.status === 'REFUNDED') {
        timeline.push({
          status: 'Refunded',
          date: t.payment.updatedAt,
          done: true,
        });
      }
    }

    if (t.vendorPayout || t.riderPayout) {
      const payout = t.vendorPayout || t.riderPayout;
      timeline.push({
        status: 'Payout Requested',
        date: payout.createdAt,
        done: true,
      });

      if (payout.status === 'PAID') {
        timeline.push({
          status: 'Transferred to Bank',
          date: payout.processedAt || payout.createdAt,
          done: true,
        });
      } else if (payout.status === 'FAILED') {
        timeline.push({
          status: 'Transfer Failed',
          date: payout.processedAt || payout.createdAt,
          done: true,
        });
      }
    }

    if (t.status === 'COMPLETED' && timeline.length === 1) {
      timeline.push({ status: 'Processed', date: t.createdAt, done: true });
    }

    return timeline;
  }

  private mapDbStatusToFrontend(status: string): string {
    const map = {
      COMPLETED: 'Success',
      PENDING: 'Processing',
      FAILED: 'Failed',
      REVERSED: 'Reversed',
    };
    return map[status] || status;
  }

  private formatTransactionType(type: string): string {
    const map = {
      PAYMENT_RECEIVED: 'Payment Received',
      COMMISSION_DEDUCTED: 'Commission Deducted',
      VENDOR_EARNING: 'Vendor Earning',
      RIDER_EARNING: 'Rider Earning',
      PAYOUT_REQUESTED: 'Payout Requested',
      PAYOUT_COMPLETED: 'Payout Completed',
      PAYOUT_FAILED: 'Payout Failed',
      REFUND_ISSUED: 'Refund Issued',
      ADJUSTMENT: 'Manual Adjustment',
      WALLET_TOPUP: 'Wallet Top-up',
    };
    return map[type] || type;
  }

  async adjustWallet(dto: AdjustWalletDto, adminId: string) {
    const { targetId, targetType, type, amount, description } = dto;

    const finalAmount = type === AdjustmentType.CREDIT ? amount : -amount;

    return this.prisma.$transaction(async (tx) => {
      let currentBalance = 0;
      let entityType: WalletEntityType;
      let entityName = '';

      if (targetType === WalletTargetType.VENDOR) {
        const store = await tx.store.findUnique({ where: { id: targetId } });
        if (!store) throw new NotFoundException('Vendor Store not found');
        currentBalance = store.walletBalance;
        entityType = WalletEntityType.STORE;
        entityName = store.name;

        if (type === AdjustmentType.DEBIT && currentBalance < amount) {
          throw new BadRequestException(
            'Insufficient wallet balance for debit',
          );
        }

        await tx.store.update({
          where: { id: targetId },
          data: { walletBalance: { increment: finalAmount } },
        });
      } else {
        const rider = await tx.rider.findUnique({ where: { id: targetId } });
        if (!rider) throw new NotFoundException('Rider not found');
        currentBalance = rider.walletBalance;
        entityType = WalletEntityType.RIDER;
        entityName = rider.name;

        if (type === AdjustmentType.DEBIT && currentBalance < amount) {
          throw new BadRequestException(
            'Insufficient wallet balance for debit',
          );
        }

        await tx.rider.update({
          where: { id: targetId },
          data: { walletBalance: { increment: finalAmount } },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          type: TransactionType.ADJUSTMENT,
          amount: finalAmount,
          entityType,
          entityId: targetId,
          status: TransactionStatus.COMPLETED,
          description: description,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance + finalAmount,
          processedBy: adminId,
          metadata: {
            adminAction: type,
            reason: description,
            adminId,
          },
        },
      });

      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: 'WALLET_ADJUSTMENT',
          target: targetId,
          details: `${type} of ${amount} applied to ${targetType} (${entityName})`,
          metadata: { transactionId: transaction.id },
        },
      });

      return transaction;
    });
  }

  async verifyTransactionPayment(id: string, adminId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        payment: true,
      },
    });

    if (!transaction) throw new NotFoundException('Transaction not found');

    if (!transaction.payment) {
      throw new BadRequestException(
        'This transaction is not linked to a verifyable payment record.',
      );
    }

    const { reference, gateway } = transaction.payment;

    if (!reference) {
      throw new BadRequestException('Payment record has no reference.');
    }

    const verificationResult = await this.paymentService.verifyPayment(
      reference,
      gateway as PaymentGateway,
    );

    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'PAYMENT_MANUAL_VERIFICATION',
        target: id,
        details: `Admin manually triggered verification for ref: ${reference}`,
        metadata: {
          transactionId: id,
          reference,
          gatewayResponse: verificationResult?.status || 'N/A',
        },
      },
    });

    return {
      success: true,
      message: 'Verification process completed.',
      data: verificationResult,
    };
  }
}
