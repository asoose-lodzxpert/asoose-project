import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { 
  TransactionType, 
  TransactionStatus, 
  WalletEntityType, 
  Prisma 
} from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all transactions with filters and pagination
   */
  async findAll(query: TransactionFilterDto) {
    const { search, status, type, from, to, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    // Date Filter
    const dateFilter = (from || to) ? {
      createdAt: {
        ...(from && { gte: new Date(new Date(from).setHours(0, 0, 0, 0)) }),
        ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) })
      }
    } : {};

    // Build WHERE clause for search
    const searchFilter: Prisma.TransactionWhereInput = search ? {
      OR: [
        { id: { contains: search, mode: 'insensitive' } },
        { payment: { transactionId: { contains: search, mode: 'insensitive' } } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    // Build status filter
    const statusFilterClause: Prisma.TransactionWhereInput = status && status !== 'All' 
      ? { status: this.mapFrontendStatusToDb(status) as TransactionStatus }
      : {};

    // Build type filter
    const typeFilterClause: Prisma.TransactionWhereInput = type && type !== 'All'
      ? { type: { in: this.getTransactionTypesByFilter(type) as TransactionType[] } }
      : {};

    // Fetch transactions from unified ledger
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          ...dateFilter,
          ...searchFilter,
          ...statusFilterClause,
          ...typeFilterClause
        },
        include: {
          payment: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              order: { 
                include: { 
                  store: { select: { name: true } } 
                } 
              },
              ride: { select: { id: true } }
            }
          },
          vendorPayout: {
            include: {
              store: { 
                select: { 
                  name: true,
                  owner: { select: { name: true, email: true } }
                } 
              }
            }
          },
          riderPayout: {
            include: {
              riderProfile: {
                include: {
                  user: { select: { name: true, email: true } },
                  vehicle: { select: { plateNumber: true } }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      this.prisma.transaction.count({
        where: {
          ...dateFilter,
          ...searchFilter,
          ...statusFilterClause,
          ...typeFilterClause
        }
      })
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
        pages: Math.ceil(total / Number(limit))
      }
    };
  }

  /**
   * Get single transaction detail
   */
  async findOne(id: string) {
    // 1. Fetch the base transaction with existing relations
    const t = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        payment: {
          include: {
            user: true,
            order: {
              include: {
                store: {
                  include: { bankAccount: true }
                },
                items: {
                  include: { product: { select: { name: true, image: true } } }
                }
              }
            },
            ride: {
              include: {
                pickupAddress: true,
                dropoffAddress: true,
                rider: {
                  include: { user: true, vehicle: true }
                }
              }
            }
          }
        },
        vendorPayout: {
          include: {
            store: {
              include: {
                owner: true,
                bankAccount: true,
                orders: {
                  where: {
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                    status: 'DELIVERED'
                  },
                  select: { id: true, total: true }
                }
              }
            }
          }
        },
        riderPayout: {
          include: {
            riderProfile: {
              include: {
                user: true,
                vehicle: true,
                rides: {
                  where: {
                    status: 'COMPLETED',
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                  },
                  select: { id: true, totalFare: true, distanceKm: true }
                },
                deliveries: {
                  where: {
                    status: 'DELIVERED',
                    createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                  },
                  select: { id: true, deliveryFee: true, distanceKm: true }
                }
              }
            }
          }
        }
      }
    });

    if (!t) {
      throw new NotFoundException('Transaction not found');
    }

    // 2. Transform the base data
    let detail = this.transformTransactionDetail(t);

    // =========================================================
    // 🚀 MANUAL FETCH: Fill in missing context (Order/Ride)
    // =========================================================

    // A. Fetch Order if we have ID but no details
    if (t.orderId && !detail.orderDetails) {
      const order = await this.prisma.order.findUnique({
        where: { id: t.orderId },
        include: {
          store: true,
          items: { include: { product: true } }
        }
      });

      if (order) {
        const subtotal = order.items.reduce((sum, i) => sum + (i.quantity * i.price), 0);
        const commission = subtotal * (order.store.commissionRate / 100);

        detail.orderDetails = {
          orderId: order.id,
          vendor: order.store.name,
          vendorAddress: order.store.address,
          commissionRate: order.store.commissionRate,
          commissionAmount: commission,
          items: order.items.map((i) => ({
            name: i.nameSnap,
            qty: i.quantity,
            price: i.price,
            total: i.quantity * i.price,
            image: i.product?.image,
            options: i.selectedOptions
          })),
          subtotal,
          total: order.total
        };

        if (!detail.financialBreakdown) {
          detail.financialBreakdown = {
            customerPaid: order.total,
            platformCommission: commission,
            vendorReceives: subtotal - commission
          };
        }
      }
    }

    // B. Fetch Ride if we have ID but no details
    if (t.rideId && !detail.rideDetails) {
      const ride = await this.prisma.ride.findUnique({
        where: { id: t.rideId },
        include: {
          rider: { include: { user: true, vehicle: true } },
          pickupAddress: true,
          dropoffAddress: true,
          customer: { select: { name: true, email: true, phone: true } }
        }
      });

      if (ride) {
        if (!detail.customer) {
            detail.customer = {
                name: ride.customer.name,
                email: ride.customer.email,
                phone: ride.customer.phone
            };
        }

        detail.rideDetails = {
          rideId: ride.id,
          driver: ride.rider?.user.name || 'Unassigned',
          vehicle: ride.rider?.vehicle 
            ? `${ride.rider.vehicle.brand} ${ride.rider.vehicle.model}` 
            : null,
          pickup: { 
            address: ride.pickupAddress.street, 
            lat: ride.pickupAddress.lat, 
            lng: ride.pickupAddress.lng 
          },
          dropoff: { 
            address: ride.dropoffAddress.street, 
            lat: ride.dropoffAddress.lat, 
            lng: ride.dropoffAddress.lng 
          },
          distance: ride.distanceKm ? `${ride.distanceKm} km` : null,
          duration: ride.durationMin ? `${ride.durationMin} min` : null,
          status: ride.status
        };

        detail.ridePricing = {
          baseFare: ride.baseFare || 0,
          distanceFare: ride.distanceFare || 0,
          timeFare: ride.timeFare || 0,
          surgeMultiplier: ride.surgeMultiplier || 1,
          platformFee: ride.platformFee || 0,
          driverFee: ride.driverFee || 0,
          totalFare: ride.totalFare || 0
        };
      }
    }

    return detail;
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
    // ✅ FIX: Explicitly type as UncheckedCreateInput to allow raw IDs (paymentId, orderId, etc.)
    const createData: Prisma.TransactionUncheckedCreateInput = {
      type: data.type as TransactionType,
      amount: data.amount,
      description: data.description,
      balanceBefore: data.balanceBefore,
      balanceAfter: data.balanceAfter,
      status: (data.status as TransactionStatus) || TransactionStatus.COMPLETED,
      metadata: data.metadata || {},
      
      // Handle Enums and Optionals explicitly
      entityType: data.entityType ? (data.entityType as WalletEntityType) : null,
      entityId: data.entityId || null,
      
      // Foreign Keys
      paymentId: data.paymentId || null,
      vendorPayoutId: data.vendorPayoutId || null,
      riderPayoutId: data.riderPayoutId || null,
      orderId: data.orderId || null,
      rideId: data.rideId || null,
      deliveryId: data.deliveryId || null,
      processedBy: data.processedBy || null,
    };

    return this.prisma.transaction.create({
      data: createData
    });
  }

  /**
   * Get wallet transaction history for an entity
   */
  async getWalletHistory(entityType: 'STORE' | 'RIDER', entityId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: {
          entityType: entityType as any,
          entityId
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.transaction.count({
        where: { 
          entityType: entityType as any,
          entityId 
        }
      })
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async calculateStats(dateFilter: any) {
    const [
      paymentsCompleted,
      paymentsRefunded,
      vendorPayouts,
      riderPayouts
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: { in: ['PAYMENT_RECEIVED', 'WALLET_TOPUP'] },
          status: 'COMPLETED',
          ...dateFilter
        }
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'REFUND_ISSUED',
          status: 'COMPLETED',
          ...dateFilter
        }
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: { in: ['PAYOUT_COMPLETED', 'VENDOR_EARNING'] },
          entityType: 'STORE',
          status: 'COMPLETED',
          ...dateFilter
        }
      }),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: { in: ['PAYOUT_COMPLETED', 'RIDER_EARNING'] },
          entityType: 'RIDER',
          status: 'COMPLETED',
          ...dateFilter
        }
      })
    ]);

    const revenue = (paymentsCompleted._sum.amount || 0);
    const refunds = (paymentsRefunded._sum.amount || 0);
    const payouts = (vendorPayouts._sum.amount || 0) + (riderPayouts._sum.amount || 0);

    return {
      revenue,
      refunds,
      payouts,
      net: revenue - refunds - payouts
    };
  }

  private mapFrontendStatusToDb(status: string): string {
    const map = {
      'Success': 'COMPLETED',
      'Processing': 'PENDING',
      'Failed': 'FAILED',
      'Refunded': 'REVERSED'
    };
    return map[status] || status;
  }

  private getTransactionTypesByFilter(filter: string): string[] {
    if (filter === 'Credit') {
      return ['PAYMENT_RECEIVED', 'WALLET_TOPUP', 'VENDOR_EARNING', 'RIDER_EARNING', 'ADJUSTMENT'];
    }
    if (filter === 'Debit') {
      return ['COMMISSION_DEDUCTED', 'PAYOUT_REQUESTED', 'PAYOUT_COMPLETED', 'REFUND_ISSUED'];
    }
    return [];
  }

  private transformTransactionListItem = (t: any) => {
    const isCredit = ['PAYMENT_RECEIVED', 'WALLET_TOPUP', 'VENDOR_EARNING', 'RIDER_EARNING', 'ADJUSTMENT'].includes(t.type);
    
    // Determine user/entity name
    let userName = 'System';
    let userEmail = null;
    
    if (t.payment?.user) {
      userName = t.payment.user.name;
      userEmail = t.payment.user.email;
    } else if (t.vendorPayout?.store) {
      userName = t.vendorPayout.store.name;
      userEmail = t.vendorPayout.store.owner?.email;
    } else if (t.riderPayout?.riderProfile?.user) {
      userName = t.riderPayout.riderProfile.user.name;
      userEmail = t.riderPayout.riderProfile.user.email;
    }

    // Determine reference
    // ✅ FIX: Explicitly type nullable variable to allow reassignment
    let refId: string | null = null;
    let refType: string | null = null;
    
    if (t.orderId) {
      refId = t.orderId;
      refType = 'Order';
    } else if (t.rideId) {
      refId = t.rideId;
      refType = 'Ride';
    } else if (t.deliveryId) {
      refId = t.deliveryId;
      refType = 'Delivery';
    }

    return {
      id: t.id,
      type: isCredit ? 'Credit' : 'Debit',
      amount: `${isCredit ? '+' : '-'}$${Math.abs(t.amount).toFixed(2)}`,
      desc: t.description,
      method: t.payment?.method || 'BANK_TRANSFER',
      refId,
      refType,
      user: userName,
      userEmail,
      date: t.createdAt.toISOString(),
      status: this.mapDbStatusToFrontend(t.status),
      transactionType: t.type
    };
  };

  private transformTransactionDetail(t: any) {
    const isCredit = ['PAYMENT_RECEIVED', 'WALLET_TOPUP', 'VENDOR_EARNING', 'RIDER_EARNING'].includes(t.type);
    
    // Base transaction info
    const detail: any = {
      id: t.id,
      status: this.mapDbStatusToFrontend(t.status),
      amount: t.amount,
      type: this.formatTransactionType(t.type),
      method: t.payment?.method || t.vendorPayout?.method || t.riderPayout?.method || 'WALLET',
      date: t.createdAt,
      reference: t.payment?.transactionId || t.vendorPayout?.reference || t.riderPayout?.reference || `REF-${t.id.slice(0, 8).toUpperCase()}`,
      description: t.description,
      balanceBefore: t.balanceBefore,
      balanceAfter: t.balanceAfter,
      metadata: t.metadata,
      timeline: this.buildTimeline(t)
    };

    // Payment details
    if (t.payment) {
      detail.customer = {
        name: t.payment.user.name,
        email: t.payment.user.email,
        phone: t.payment.user.phone
      };

      detail.paymentInfo = {
        transactionId: t.payment.transactionId,
        paymentMethod: t.payment.method,
        status: t.payment.status,
        failureReason: t.payment.failureReason
      };

      if (t.payment.order) {
        const order = t.payment.order;
        const subtotal = order.items.reduce((sum, i) => sum + (i.quantity * i.price), 0);
        const commission = subtotal * (order.store.commissionRate / 100);
        
        detail.orderDetails = {
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
            image: i.product?.image,
            options: i.selectedOptions
          })),
          subtotal,
          total: order.total
        };

        detail.financialBreakdown = {
          customerPaid: order.total,
          platformCommission: commission,
          vendorReceives: subtotal - commission
        };
      }

      if (t.payment.ride) {
        const ride = t.payment.ride;
        
        detail.rideDetails = {
          rideId: ride.id,
          driver: ride.rider?.user.name || 'Unassigned',
          driverPhone: ride.rider?.user.phone,
          vehicle: ride.rider?.vehicle 
            ? `${ride.rider.vehicle.brand} ${ride.rider.vehicle.model} (${ride.rider.vehicle.plateNumber})`
            : null,
          pickup: { 
            address: ride.pickupAddress.street, 
            lat: ride.pickupAddress.lat, 
            lng: ride.pickupAddress.lng 
          },
          dropoff: { 
            address: ride.dropoffAddress.street, 
            lat: ride.dropoffAddress.lat, 
            lng: ride.dropoffAddress.lng 
          },
          distance: ride.distanceKm ? `${ride.distanceKm.toFixed(2)} km` : null,
          duration: ride.durationMin ? `${ride.durationMin} min` : null,
          status: ride.status
        };

        detail.ridePricing = {
          baseFare: ride.baseFare || 0,
          distanceFare: ride.distanceFare || 0,
          timeFare: ride.timeFare || 0,
          surgeMultiplier: ride.surgeMultiplier || 1.0,
          platformFee: ride.platformFee || 0,
          driverFee: ride.driverFee || 0,
          totalFare: ride.totalFare || 0
        };

        detail.financialBreakdown = {
          customerPaid: ride.totalFare || 0,
          platformFee: ride.platformFee || 0,
          driverReceives: ride.driverFee || 0
        };
      }
    }

    // Vendor Payout
    if (t.vendorPayout) {
      const payout = t.vendorPayout;
      detail.customer = {
        name: payout.store.name,
        email: payout.store.owner?.email,
        phone: payout.store.owner?.phone
      };

      detail.bankInfo = payout.store.bankAccount ? {
        bankName: payout.store.bankAccount.bankName,
        accountNumber: payout.store.bankAccount.accountNumber,
        accountName: payout.store.bankAccount.accountName,
        currency: payout.store.bankAccount.currency
      } : null;

      detail.payoutInfo = {
        reference: payout.reference,
        method: payout.method,
        status: payout.status,
        requestedAt: payout.createdAt,
        processedAt: payout.createdAt
      };

      if (payout.store.orders) {
        const totalRevenue = payout.store.orders.reduce((sum, o) => sum + o.total, 0);
        detail.recentActivity = {
          period: 'Last 30 days',
          totalOrders: payout.store.orders.length,
          totalRevenue: totalRevenue,
          averageOrderValue: payout.store.orders.length > 0 
            ? totalRevenue / payout.store.orders.length 
            : 0
        };
      }
    }

    // Rider Payout
    if (t.riderPayout) {
      const payout = t.riderPayout;
      detail.customer = {
        name: payout.riderProfile.user.name,
        email: payout.riderProfile.user.email,
        phone: payout.riderProfile.user.phone
      };

      detail.vehicleInfo = payout.riderProfile.vehicle ? {
        type: payout.riderProfile.vehicle.type,
        brand: payout.riderProfile.vehicle.brand,
        model: payout.riderProfile.vehicle.model,
        plateNumber: payout.riderProfile.vehicle.plateNumber,
        color: payout.riderProfile.vehicle.color,
        year: payout.riderProfile.vehicle.year
      } : null;

      detail.payoutInfo = {
        reference: payout.reference,
        method: payout.method,
        status: payout.status,
        requestedAt: payout.createdAt,
        processedAt: payout.processedAt || t.createdAt
      };

      const rides = payout.riderProfile.rides || [];
      const deliveries = payout.riderProfile.deliveries || [];
      const totalRideEarnings = rides.reduce((sum, r) => sum + (r.totalFare || 0), 0);
      const totalDeliveryEarnings = deliveries.reduce((sum, d) => sum + d.deliveryFee, 0);
      const totalDistance = rides.reduce((sum, r) => sum + (r.distanceKm || 0), 0) +
                           deliveries.reduce((sum, d) => sum + (d.distanceKm || 0), 0);
      
      detail.recentActivity = {
        period: 'Last 30 days',
        totalRides: rides.length,
        totalDeliveries: deliveries.length,
        totalTrips: rides.length + deliveries.length,
        totalEarnings: totalRideEarnings + totalDeliveryEarnings,
        totalDistance: `${totalDistance.toFixed(2)} km`,
        averageEarningPerTrip: (rides.length + deliveries.length) > 0
          ? (totalRideEarnings + totalDeliveryEarnings) / (rides.length + deliveries.length)
          : 0
      };
    }

    return detail;
  }

  // ✅ FIX: Explicitly type the timeline array to allow 'note' property
  private buildTimeline(t: any): { status: string; date: any; done: boolean; note?: string }[] {
    const timeline: { status: string; date: any; done: boolean; note?: string }[] = [
      { status: 'Initiated', date: t.createdAt, done: true }
    ];

    if (t.payment) {
      if (t.payment.status === 'COMPLETED') {
        timeline.push({ status: 'Payment Completed', date: t.payment.updatedAt, done: true });
      } else if (t.payment.status === 'FAILED') {
        timeline.push({ 
          status: 'Payment Failed', 
          date: t.payment.updatedAt, 
          done: true,
          note: t.payment.failureReason 
        });
      } else if (t.payment.status === 'REFUNDED') {
        timeline.push({ status: 'Refunded', date: t.payment.updatedAt, done: true });
      }
    }

    if (t.vendorPayout || t.riderPayout) {
      const payout = t.vendorPayout || t.riderPayout;
      timeline.push({ status: 'Payout Requested', date: payout.createdAt, done: true });
      
      if (payout.status === 'PAID') {
        timeline.push({ 
          status: 'Transferred to Bank', 
          date: payout.processedAt || payout.createdAt, 
          done: true 
        });
      } else if (payout.status === 'FAILED') {
        timeline.push({ 
          status: 'Transfer Failed', 
          date: payout.processedAt || payout.createdAt, 
          done: true 
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
      'COMPLETED': 'Success',
      'PENDING': 'Processing',
      'FAILED': 'Failed',
      'REVERSED': 'Reversed'
    };
    return map[status] || status;
  }

  private formatTransactionType(type: string): string {
    const map = {
      'PAYMENT_RECEIVED': 'Payment Received',
      'COMMISSION_DEDUCTED': 'Commission Deducted',
      'VENDOR_EARNING': 'Vendor Earning',
      'RIDER_EARNING': 'Rider Earning',
      'PAYOUT_REQUESTED': 'Payout Requested',
      'PAYOUT_COMPLETED': 'Payout Completed',
      'PAYOUT_FAILED': 'Payout Failed',
      'REFUND_ISSUED': 'Refund Issued',
      'ADJUSTMENT': 'Manual Adjustment',
      'WALLET_TOPUP': 'Wallet Top-up'
    };
    return map[type] || type;
  }
}