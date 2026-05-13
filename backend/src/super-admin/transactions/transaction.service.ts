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

// ---------------------------------------------------------------------------
// Money helpers
// All monetary values are stored and manipulated as integer cents to avoid
// floating-point drift. Use toCents() on input and fromCents() on output.
// ---------------------------------------------------------------------------

/** Convert a decimal dollar amount to integer cents (rounds half-up). */
function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Convert integer cents back to a two-decimal dollar number. */
function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Multiply a cent amount by a percentage rate and return the result in cents.
 * e.g. applyRate(10000, 15) → 1500  (15% of $100.00 = $15.00)
 */
function applyRate(amountCents: number, ratePct: number): number {
  return Math.round(amountCents * (ratePct / 100));
}

// ---------------------------------------------------------------------------
// Timeline entry shape
// ---------------------------------------------------------------------------

interface TimelineEntry {
  status: string;
  date: Date | null;
  done: boolean;
  note?: string;
}

// ---------------------------------------------------------------------------
// Financial breakdown shapes — explicit return types prevent silent omissions
// ---------------------------------------------------------------------------

interface SingleOrderBreakdown {
  customerPaid: number;
  platformCommission: number;
  deliveryFee: number;
  vendorReceives: number;
  otherAdjustments: number;
  reconciled: boolean;
}

interface GroupOrderBreakdown {
  customerPaid: number;
  totalPlatformCommission: number;
  totalDeliveryFees: number;
  totalVendorReceives: number;
  otherAdjustments: number;
  reconciled: boolean;
  vendorBreakdown: {
    store: string;
    commissionRate: number;
    vendorReceives: number;
    commission: number;
  }[];
}

interface RideBreakdown {
  customerPaid: number;
  platformFee: number;
  driverReceives: number;
  /** Absorbs surge multiplier remainder and any other unallocated fare. */
  otherAdjustments: number;
  reconciled: boolean;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
  ) {}

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  /**
   * Get all transactions with filters and pagination.
   */
  async findAll(query: TransactionFilterDto) {
    const { search, status, type, from, to, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const dateFilter = this.buildDateFilter(from, to);
    const searchFilter = this.buildSearchFilter(search);
    const statusFilterClause = this.buildStatusFilter(status);
    const typeFilterClause = this.buildTypeFilter(type);

    const where: Prisma.TransactionWhereInput = {
      ...dateFilter,
      ...searchFilter,
      ...statusFilterClause,
      ...typeFilterClause,
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          payment: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              order: { include: { store: { select: { name: true } } } },
              orderGroup: {
                include: {
                  orders: { include: { store: { select: { name: true } } } },
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
      this.prisma.transaction.count({ where }),
    ]);

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
   * Get single transaction detail.
   */
  async findOne(id: string) {
    const t = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        payment: {
          include: {
            user: true,
            order: {
              include: {
                store: { include: { bankAccount: true } },
                items: {
                  include: {
                    product: { select: { name: true, images: true } },
                  },
                },
                delivery: { select: { id: true, deliveryFee: true, status: true } },
              },
            },
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
                    delivery: { select: { id: true, deliveryFee: true, status: true } },
                  },
                },
              },
            },
            ride: {
              include: {
                pickupAddress: true,
                dropoffAddress: true,
                customer: { select: { name: true, email: true, phone: true } },
                rider: { include: { vehicle: true } },
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

    if (!t) throw new NotFoundException('Transaction not found');

    return this.transformTransactionDetail(t);
  }

  /**
   * Create a transaction record (called internally by other services).
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
      status: (data.status as TransactionStatus) ?? TransactionStatus.COMPLETED,
      metadata: data.metadata ?? {},
      entityType: data.entityType ? (data.entityType as WalletEntityType) : null,
      entityId: data.entityId ?? null,
      paymentId: data.paymentId ?? null,
      vendorPayoutId: data.vendorPayoutId ?? null,
      riderPayoutId: data.riderPayoutId ?? null,
      orderId: data.orderId ?? null,
      rideId: data.rideId ?? null,
      deliveryId: data.deliveryId ?? null,
      processedBy: data.processedBy ?? null,
    };

    return this.prisma.transaction.create({ data: createData });
  }

  /**
   * Get wallet transaction history for a store or rider.
   */
  async getWalletHistory(
    entityType: 'STORE' | 'RIDER',
    entityId: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where = { entityType: entityType as WalletEntityType, entityId };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Apply a manual wallet credit or debit for a vendor store or rider.
   *
   * FIX #6: `amount` is clamped to its absolute value before any arithmetic so
   * that a caller who accidentally passes a negative magnitude cannot invert the
   * debit-guard check or flip a debit into a credit.
   */
  async adjustWallet(dto: AdjustWalletDto, adminId: string) {
    const { targetId, targetType, type, description } = dto;

    // FIX #6: always treat `amount` as a positive magnitude regardless of what
    // the caller supplied. DTO-level @IsPositive() should enforce this too, but
    // a belt-and-suspenders guard here ensures the arithmetic never inverts.
    const amount = Math.abs(dto.amount);
    if (amount === 0) {
      throw new BadRequestException('Adjustment amount must be non-zero.');
    }

    // Positive delta for credit, negative delta for debit — used with Prisma `increment`.
    const delta = type === AdjustmentType.CREDIT ? amount : -amount;

    return this.prisma.$transaction(async (tx) => {
      let balanceBefore: number;
      let balanceAfter: number;
      let entityType: WalletEntityType;
      let entityName: string;

      if (targetType === WalletTargetType.VENDOR) {
        const store = await tx.store.findUnique({ where: { id: targetId } });
        if (!store) throw new NotFoundException('Vendor Store not found');

        if (type === AdjustmentType.DEBIT && store.walletBalance < amount) {
          throw new BadRequestException('Insufficient wallet balance for debit');
        }

        balanceBefore = store.walletBalance;
        entityType = WalletEntityType.STORE;
        entityName = store.name;

        const updated = await tx.store.update({
          where: { id: targetId },
          data: { walletBalance: { increment: delta } },
          select: { walletBalance: true },
        });
        balanceAfter = updated.walletBalance;
      } else {
        const rider = await tx.rider.findUnique({ where: { id: targetId } });
        if (!rider) throw new NotFoundException('Rider not found');

        if (type === AdjustmentType.DEBIT && rider.walletBalance < amount) {
          throw new BadRequestException('Insufficient wallet balance for debit');
        }

        balanceBefore = rider.walletBalance;
        entityType = WalletEntityType.RIDER;
        entityName = rider.name;

        const updated = await tx.rider.update({
          where: { id: targetId },
          data: { walletBalance: { increment: delta } },
          select: { walletBalance: true },
        });
        balanceAfter = updated.walletBalance;
      }

      const transaction = await tx.transaction.create({
        data: {
          type: TransactionType.ADJUSTMENT,
          // Signed delta so sign-based credit/debit detection works correctly.
          amount: delta,
          entityType,
          entityId: targetId,
          status: TransactionStatus.COMPLETED,
          description,
          balanceBefore,
          balanceAfter,
          processedBy: adminId,
          metadata: { adminAction: type, reason: description, adminId },
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

  /**
   * Manually trigger a gateway verification for a payment-backed transaction.
   */
  async verifyTransactionPayment(id: string, adminId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { payment: true },
    });

    if (!transaction) throw new NotFoundException('Transaction not found');

    if (!transaction.payment) {
      throw new BadRequestException(
        'This transaction is not linked to a verifiable payment record.',
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
          gatewayResponse: verificationResult?.status ?? 'N/A',
        },
      },
    });

    return {
      success: true,
      message: 'Verification process completed.',
      data: verificationResult,
    };
  }

  // =========================================================================
  // PRIVATE — QUERY BUILDERS
  // =========================================================================

  private buildDateFilter(from?: string, to?: string): Prisma.TransactionWhereInput {
    if (!from && !to) return {};
    return {
      createdAt: {
        ...(from && { gte: new Date(new Date(from).setHours(0, 0, 0, 0)) }),
        ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
      },
    };
  }

  private buildSearchFilter(search?: string): Prisma.TransactionWhereInput {
    if (!search) return {};
    return {
      OR: [
        { id: { contains: search, mode: 'insensitive' } },
        { payment: { transactionId: { contains: search, mode: 'insensitive' } } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  private buildStatusFilter(status?: string): Prisma.TransactionWhereInput {
    if (!status || status === 'All') return {};
    return { status: this.mapFrontendStatusToDb(status) as TransactionStatus };
  }

  private buildTypeFilter(type?: string): Prisma.TransactionWhereInput {
    if (!type || type === 'All') return {};
    return { type: { in: this.getTransactionTypesByFilter(type) as TransactionType[] } };
  }

  // =========================================================================
  // PRIVATE — STATS
  // =========================================================================

  /**
   * Calculates platform-level financial stats for a given date range.
   *
   * Revenue  = all completed inbound payments (what customers paid in).
   * Refunds  = money returned to customers.
   * Payouts  = disbursements to vendors and riders (pass-through funds — NOT
   *            subtracted from net, because they were never platform income).
   *
   * Net profit = platform commissions (order) + platform fees (ride) − refunds.
   *
   * FIX #1: Math.abs() is applied to all aggregated sums so that records stored
   * with either sign convention (positive outflow vs negative debit) are counted
   * correctly. Previously a negative-stored payout would undercount totalPayouts.
   *
   * FIX #2: Ride platform fees are now aggregated via COMMISSION_DEDUCTED with
   * entityType PLATFORM, which is the conventional record type for platform-
   * retained income on rides. If your schema uses a different type (e.g. a
   * dedicated PLATFORM_FEE enum value), replace the `type` filter below.
   * The previous query used RIDER_EARNING / entityType PLATFORM — a type that
   * semantically belongs to rider earnings — and almost certainly returned zero,
   * causing net profit from rides to be silently omitted.
   */
  private async calculateStats(dateFilter: Prisma.TransactionWhereInput) {
    const completedFilter = { status: TransactionStatus.COMPLETED, ...dateFilter };

    const [
      paymentsAgg,
      refundsAgg,
      vendorPayoutsAgg,
      riderPayoutsAgg,
      orderCommissionAgg,
      rideCommissionAgg,
    ] = await Promise.all([
      // All customer inbound payments.
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: { in: ['PAYMENT_RECEIVED', 'WALLET_TOPUP'] }, ...completedFilter },
      }),
      // Refunds issued to customers.
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: TransactionType.REFUND_ISSUED, ...completedFilter },
      }),
      // Payouts disbursed to vendors.
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: TransactionType.PAYOUT_COMPLETED,
          entityType: WalletEntityType.STORE,
          ...completedFilter,
        },
      }),
      // Payouts disbursed to riders.
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: TransactionType.PAYOUT_COMPLETED,
          entityType: WalletEntityType.RIDER,
          ...completedFilter,
        },
      }),
      // Platform commission retained from vendor orders.
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { type: TransactionType.COMMISSION_DEDUCTED, ...completedFilter },
      }),
      // FIX #2: Platform fee retained from rides. These are recorded as
      // COMMISSION_DEDUCTED against entityType PLATFORM (ride context).
      // Adjust `type` if your schema uses a distinct PLATFORM_FEE enum value.
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          type: TransactionType.COMMISSION_DEDUCTED,
          entityType: WalletEntityType.PLATFORM,
          ...completedFilter,
        },
      }),
    ]);

    // FIX #1: Math.abs() normalises records regardless of stored sign convention.
    const revenue = Math.abs(paymentsAgg._sum.amount ?? 0);
    const refunds = Math.abs(refundsAgg._sum.amount ?? 0);
    const vendorPayouts = Math.abs(vendorPayoutsAgg._sum.amount ?? 0);
    const riderPayouts = Math.abs(riderPayoutsAgg._sum.amount ?? 0);
    const orderCommissions = Math.abs(orderCommissionAgg._sum.amount ?? 0);
    const ridePlatformFees = Math.abs(rideCommissionAgg._sum.amount ?? 0);

    // Net = all platform-retained income minus refunds issued.
    const net = orderCommissions + ridePlatformFees - refunds;

    return {
      revenue,
      refunds,
      vendorPayouts,
      riderPayouts,
      totalPayouts: vendorPayouts + riderPayouts,
      orderCommissions,
      ridePlatformFees,
      /** Total platform income after refunds. */
      net,
    };
  }

  // =========================================================================
  // PRIVATE — LIST ITEM TRANSFORMER
  // =========================================================================

  /**
   * Credit vs Debit is determined by the sign of `t.amount`
   * (positive = credit, negative = debit). This correctly handles
   * ADJUSTMENT records that carry a negative delta.
   *
   * FIX #7: Removed the redundant toCents → fromCents round-trip on
   * `displayAmount`. Math.abs on the raw DB value is sufficient; the value is
   * already in the correct unit as stored.
   */
  private transformTransactionListItem = (t: any) => {
    const isCredit = t.amount >= 0;

    let userName = 'System';
    let userEmail: string | null = null;

    if (t.payment?.user) {
      userName = t.payment.user.name;
      userEmail = t.payment.user.email;
    } else if (t.vendorPayout?.store) {
      userName = t.vendorPayout.store.name;
      userEmail = t.vendorPayout.store.vendor?.email ?? null;
    } else if (t.riderPayout?.rider) {
      userName = t.riderPayout.rider.name;
      userEmail = t.riderPayout.rider.email;
    }

    let refId: string | null = null;
    let refType: string | null = null;

    if (t.orderId) {
      refId = t.orderId;
      refType = 'Order';
    } else if (t.payment?.order) {
      refId = t.payment.order.id;
      refType = 'Order';
    } else if (t.payment?.orderGroup) {
      refId = t.payment.orderGroup.id;
      refType = 'OrderGroup';
    } else if (t.rideId) {
      refId = t.rideId;
      refType = 'Ride';
    } else if (t.deliveryId) {
      refId = t.deliveryId;
      refType = 'Delivery';
    }

    let description: string = t.description;
    if (refType === 'OrderGroup' && t.payment?.orderGroup) {
      const storeCount = t.payment.orderGroup.orders?.length ?? 0;
      description = `Multi-Vendor Checkout (${storeCount} Stores)`;
    }

    // FIX #7: display the raw absolute amount directly — no redundant cent
    // round-trip. toFixed(2) handles display precision.
    const displayAmount = Math.abs(t.amount);

    return {
      id: t.id,
      type: isCredit ? 'Credit' : 'Debit',
      amount: `${isCredit ? '+' : '-'}$${displayAmount.toFixed(2)}`,
      desc: description,
      method: t.payment?.method ?? 'BANK_TRANSFER',
      refId,
      refType,
      user: userName,
      userEmail,
      date: t.createdAt.toISOString(),
      status: this.mapDbStatusToFrontend(t.status),
      transactionType: t.type,
    };
  };

  // =========================================================================
  // PRIVATE — DETAIL TRANSFORMER
  // =========================================================================

  private transformTransactionDetail(t: any) {
    const detail: any = {
      id: t.id,
      status: this.mapDbStatusToFrontend(t.status),
      amount: t.amount,
      type: this.formatTransactionType(t.type),
      method:
        t.payment?.method ??
        t.vendorPayout?.method ??
        t.riderPayout?.method ??
        'WALLET',
      date: t.createdAt,
      reference:
        t.payment?.transactionId ??
        t.vendorPayout?.reference ??
        t.riderPayout?.reference ??
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

      if (t.payment.order) {
        detail.orderDetails = this.buildSingleOrderDetails(t.payment.order);
        detail.financialBreakdown = this.buildSingleOrderBreakdown(t.payment.order);
      } else if (t.payment.orderGroup) {
        detail.orderDetails = this.buildGroupOrderDetails(t.payment.orderGroup);
        detail.financialBreakdown = this.buildGroupOrderBreakdown(t.payment.orderGroup);
      }

      if (t.payment.ride) {
        const ride = t.payment.ride;
        detail.rideDetails = this.buildRideDetails(ride);
        detail.ridePricing = this.buildRidePricing(ride);
        detail.financialBreakdown = this.buildRideBreakdown(ride);
      }
    }

    if (t.vendorPayout) {
      detail.customer = this.buildVendorCustomer(t.vendorPayout);
      detail.bankInfo = this.buildBankInfo(t.vendorPayout.store.bankAccount);
      detail.payoutInfo = this.buildPayoutInfo(t.vendorPayout);
      detail.recentActivity = this.buildVendorActivity(t.vendorPayout.store.orders);
    }

    if (t.riderPayout) {
      detail.customer = this.buildRiderCustomer(t.riderPayout);
      detail.vehicleInfo = this.buildVehicleInfo(t.riderPayout.rider.vehicle);
      detail.payoutInfo = this.buildPayoutInfo(t.riderPayout);
      detail.recentActivity = this.buildRiderActivity(t.riderPayout.rider);
    }

    return detail;
  }

  // -------------------------------------------------------------------------
  // Order detail builders
  // -------------------------------------------------------------------------

  private buildSingleOrderDetails(order: any) {
    const subtotalCents = order.items.reduce(
      (sum: number, i: any) => sum + toCents(i.quantity * i.price),
      0,
    );
    const commissionCents = applyRate(subtotalCents, order.store.commissionRate);
    const deliveryFeeCents = toCents(order.delivery?.deliveryFee ?? 0);

    return {
      type: 'SINGLE_ORDER',
      orderId: order.id,
      vendor: order.store.name,
      vendorAddress: order.store.address,
      commissionRate: order.store.commissionRate,
      commissionAmount: fromCents(commissionCents),
      items: order.items.map((i: any) => ({
        name: i.nameSnap,
        qty: i.quantity,
        price: i.price,
        total: fromCents(toCents(i.quantity * i.price)),
        image: i.product?.images?.[0] ?? null,
        options: i.selectedOptions,
      })),
      subtotal: fromCents(subtotalCents),
      deliveryFee: fromCents(deliveryFeeCents),
      total: order.total,
    };
  }

  /**
   * Builds the financial breakdown for a single-order payment.
   *
   * All arithmetic is done in integer cents to avoid float drift. The breakdown
   * is:
   *   platformCommission + deliveryFee + vendorReceives = customerPaid (ideally)
   *
   * FIX #3: `reconciled` is now returned as a first-class field so callers and
   * the admin UI can surface a warning instead of silently swallowing it. The
   * gap (taxes, promos, rounding) is reported in `otherAdjustments`.
   *
   * Note on commission base: commission is calculated from the live item total,
   * not `order.total`. If `order.total` was stored with a discount applied, the
   * two bases diverge and `otherAdjustments` absorbs the difference — which is
   * the correct behaviour. Do not change the commission base to `order.total`
   * unless your commission policy explicitly keys off the discounted total.
   */
  private buildSingleOrderBreakdown(order: any): SingleOrderBreakdown {
    const subtotalCents = order.items.reduce(
      (sum: number, i: any) => sum + toCents(i.quantity * i.price),
      0,
    );
    const commissionCents = applyRate(subtotalCents, order.store.commissionRate);
    const deliveryFeeCents = toCents(order.delivery?.deliveryFee ?? 0);
    const vendorReceivesCents = subtotalCents - commissionCents;
    const customerPaidCents = toCents(order.total);

    const breakdownSumCents = commissionCents + deliveryFeeCents + vendorReceivesCents;
    const adjustmentCents = customerPaidCents - breakdownSumCents;
    const reconciled = adjustmentCents === 0;

    if (!reconciled) {
      console.warn(
        `[TransactionsService] Single-order breakdown mismatch for order ${order.id}: ` +
          `breakdown=${breakdownSumCents}¢ vs customerPaid=${customerPaidCents}¢ ` +
          `(gap=${adjustmentCents}¢ — likely taxes or discount).`,
      );
    }

    return {
      customerPaid: fromCents(customerPaidCents),
      platformCommission: fromCents(commissionCents),
      deliveryFee: fromCents(deliveryFeeCents),
      vendorReceives: fromCents(vendorReceivesCents),
      otherAdjustments: fromCents(adjustmentCents),
      /** false when taxes, discounts, or rounding cause a gap. */
      reconciled,
    };
  }

  /**
   * FIX #4: Commission base is consistent across both group detail and group
   * breakdown builders.
   *
   * Both builders now derive `subtotalCents` from line items (not `o.total`).
   * `customerPaid` is separately derived from `o.total` and any gap is reported
   * in `otherAdjustments` / `reconciled`, matching single-order behaviour.
   *
   * Previously, the breakdown used `o.total`-based `groupTotalCents` for
   * `customerPaid` but item-based `subtotalCents` for commissions, so a
   * discounted order would show commission calculated on the pre-discount
   * subtotal but customer paid reflecting the post-discount total — the
   * breakdown would not balance and the source of the gap was invisible.
   */
  private buildGroupOrderDetails(orderGroup: any) {
    const orders: any[] = orderGroup.orders ?? [];

    const subOrders = orders.map((o) => {
      const subtotalCents = o.items.reduce(
        (sum: number, i: any) => sum + toCents(i.quantity * i.price),
        0,
      );
      const commissionCents = applyRate(subtotalCents, o.store.commissionRate);
      const deliveryFeeCents = toCents(o.delivery?.deliveryFee ?? 0);

      return {
        orderId: o.id,
        store: o.store.name,
        commissionRate: o.store.commissionRate,
        subtotal: fromCents(subtotalCents),
        commissionAmount: fromCents(commissionCents),
        vendorReceives: fromCents(subtotalCents - commissionCents),
        deliveryFee: fromCents(deliveryFeeCents),
        // FIX #4: expose both the live-item total and the stored order total so
        // the caller can see if a discount was applied.
        itemTotal: fromCents(subtotalCents + deliveryFeeCents),
        storedTotal: o.total,
      };
    });

    const allItems = orders.flatMap((o) =>
      o.items.map((i: any) => ({
        storeName: o.store.name,
        name: i.nameSnap,
        qty: i.quantity,
        price: i.price,
        total: fromCents(toCents(i.quantity * i.price)),
        image: i.product?.images?.[0] ?? null,
        options: i.selectedOptions,
      })),
    );

    const totalDeliveryFeesCents = orders.reduce(
      (sum, o) => sum + toCents(o.delivery?.deliveryFee ?? 0),
      0,
    );
    // Use stored order totals for the group summary (reflects actual charge).
    const groupTotalCents = orders.reduce((sum, o) => sum + toCents(o.total), 0);

    return {
      type: 'GROUP_ORDER',
      groupId: orderGroup.id,
      vendor: 'Multi-Vendor',
      subOrders,
      items: allItems,
      totalDeliveryFees: fromCents(totalDeliveryFeesCents),
      total: fromCents(groupTotalCents),
    };
  }

  private buildGroupOrderBreakdown(orderGroup: any): GroupOrderBreakdown {
    const orders: any[] = orderGroup.orders ?? [];

    let totalCommissionCents = 0;
    let totalVendorReceivesCents = 0;
    let totalDeliveryFeesCents = 0;

    const vendorBreakdown = orders.map((o) => {
      const subtotalCents = o.items.reduce(
        (sum: number, i: any) => sum + toCents(i.quantity * i.price),
        0,
      );
      const commissionCents = applyRate(subtotalCents, o.store.commissionRate);
      const deliveryFeeCents = toCents(o.delivery?.deliveryFee ?? 0);

      totalCommissionCents += commissionCents;
      totalVendorReceivesCents += subtotalCents - commissionCents;
      totalDeliveryFeesCents += deliveryFeeCents;

      return {
        store: o.store.name,
        commissionRate: o.store.commissionRate,
        vendorReceives: fromCents(subtotalCents - commissionCents),
        commission: fromCents(commissionCents),
      };
    });

    // customerPaid is what was actually charged (stored totals).
    const groupTotalCents = orders.reduce((sum, o) => sum + toCents(o.total), 0);
    const breakdownSumCents =
      totalCommissionCents + totalVendorReceivesCents + totalDeliveryFeesCents;
    const adjustmentCents = groupTotalCents - breakdownSumCents;
    const reconciled = adjustmentCents === 0;

    if (!reconciled) {
      console.warn(
        `[TransactionsService] Group-order breakdown mismatch for group ${orderGroup.id}: ` +
          `breakdown=${breakdownSumCents}¢ vs customerPaid=${groupTotalCents}¢ ` +
          `(gap=${adjustmentCents}¢ — likely taxes or discount).`,
      );
    }

    return {
      customerPaid: fromCents(groupTotalCents),
      totalPlatformCommission: fromCents(totalCommissionCents),
      totalDeliveryFees: fromCents(totalDeliveryFeesCents),
      totalVendorReceives: fromCents(totalVendorReceivesCents),
      otherAdjustments: fromCents(adjustmentCents),
      reconciled,
      vendorBreakdown,
    };
  }

  // -------------------------------------------------------------------------
  // Ride detail builders
  // -------------------------------------------------------------------------

  private buildRideDetails(ride: any) {
    return {
      rideId: ride.id,
      driver: ride.rider?.name ?? 'Unassigned',
      driverPhone: ride.rider?.phone ?? null,
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
      distance: ride.distanceKm != null ? `${ride.distanceKm.toFixed(2)} km` : null,
      duration: ride.durationMin != null ? `${ride.durationMin} min` : null,
      status: ride.status,
    };
  }

  private buildRidePricing(ride: any) {
    return {
      baseFare: ride.baseFare ?? 0,
      distanceFare: ride.distanceFare ?? 0,
      timeFare: ride.timeFare ?? 0,
      surgeMultiplier: ride.surgeMultiplier ?? 1.0,
      platformFee: ride.platformFee ?? 0,
      driverFee: ride.driverFee ?? 0,
      totalFare: ride.totalFare ?? 0,
    };
  }

  /**
   * FIX #5: `otherAdjustments` is now included in the returned object so that
   * surge multiplier remainders and any other unallocated fare are surfaced
   * rather than silently dropped. Previously the breakdown returned three fields
   * that did not necessarily sum to `customerPaid` for surged rides, with no
   * way for the caller to detect the gap.
   *
   * `reconciled` is false whenever surge or rounding causes a gap, mirroring
   * the single/group order breakdown contract.
   */
  private buildRideBreakdown(ride: any): RideBreakdown {
    const totalFareCents = toCents(ride.totalFare ?? 0);
    const platformFeeCents = toCents(ride.platformFee ?? 0);
    const driverFeeCents = toCents(ride.driverFee ?? 0);
    const breakdownSumCents = platformFeeCents + driverFeeCents;
    const adjustmentCents = totalFareCents - breakdownSumCents;
    const reconciled = adjustmentCents === 0;

    if (!reconciled) {
      console.warn(
        `[TransactionsService] Ride breakdown mismatch for ride ${ride.id}: ` +
          `platformFee(${platformFeeCents}¢) + driverFee(${driverFeeCents}¢) ` +
          `= ${breakdownSumCents}¢ vs totalFare=${totalFareCents}¢ ` +
          `(gap=${adjustmentCents}¢ — likely surge remainder).`,
      );
    }

    return {
      customerPaid: fromCents(totalFareCents),
      platformFee: fromCents(platformFeeCents),
      driverReceives: fromCents(driverFeeCents),
      /** Surge remainder and any other unallocated fare. */
      otherAdjustments: fromCents(adjustmentCents),
      reconciled,
    };
  }

  // -------------------------------------------------------------------------
  // Payout detail builders
  // -------------------------------------------------------------------------

  private buildVendorCustomer(vendorPayout: any) {
    return {
      name: vendorPayout.store.name,
      email: vendorPayout.store.owner?.email ?? null,
      phone: vendorPayout.store.owner?.phone ?? null,
    };
  }

  private buildRiderCustomer(riderPayout: any) {
    return {
      name: riderPayout.rider.name,
      email: riderPayout.rider.email,
      phone: riderPayout.rider.phone,
    };
  }

  private buildBankInfo(bankAccount: any) {
    if (!bankAccount) return null;
    return {
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      currency: bankAccount.currency,
    };
  }

  private buildVehicleInfo(vehicle: any) {
    if (!vehicle) return null;
    return {
      type: vehicle.type,
      brand: vehicle.brand,
      model: vehicle.model,
      plateNumber: vehicle.plateNumber,
      color: vehicle.color,
      year: vehicle.year,
    };
  }

  private buildPayoutInfo(payout: any) {
    return {
      reference: payout.reference,
      method: payout.method,
      status: payout.status,
      requestedAt: payout.createdAt,
      // null correctly signals the payout has not yet been processed.
      processedAt: payout.processedAt ?? null,
    };
  }

  private buildVendorActivity(orders: any[]) {
    if (!orders) return null;
    const totalRevenueCents = orders.reduce((sum, o) => sum + toCents(o.total), 0);
    const count = orders.length;
    return {
      period: 'Last 30 days',
      totalOrders: count,
      totalRevenue: fromCents(totalRevenueCents),
      averageOrderValue: count > 0 ? fromCents(Math.round(totalRevenueCents / count)) : 0,
    };
  }

  private buildRiderActivity(rider: any) {
    const rides: any[] = rider.rides ?? [];
    const deliveries: any[] = rider.deliveries ?? [];

    const rideEarningsCents = rides.reduce(
      (sum, r) => sum + toCents(r.totalFare ?? 0),
      0,
    );
    const deliveryEarningsCents = deliveries.reduce(
      (sum, d) => sum + toCents(d.deliveryFee ?? 0),
      0,
    );
    const totalEarningsCents = rideEarningsCents + deliveryEarningsCents;

    const totalDistanceKm =
      rides.reduce((sum, r) => sum + (r.distanceKm ?? 0), 0) +
      deliveries.reduce((sum, d) => sum + (d.distanceKm ?? 0), 0);

    const totalTrips = rides.length + deliveries.length;

    return {
      period: 'Last 30 days',
      totalRides: rides.length,
      totalDeliveries: deliveries.length,
      totalTrips,
      totalEarnings: fromCents(totalEarningsCents),
      totalDistance: `${totalDistanceKm.toFixed(2)} km`,
      averageEarningPerTrip:
        totalTrips > 0 ? fromCents(Math.round(totalEarningsCents / totalTrips)) : 0,
    };
  }

  // =========================================================================
  // PRIVATE — TIMELINE
  // =========================================================================

  private buildTimeline(t: any): TimelineEntry[] {
    const timeline: TimelineEntry[] = [
      { status: 'Initiated', date: t.createdAt, done: true },
    ];

    if (t.payment) {
      if (t.payment.status === 'COMPLETED') {
        timeline.push({ status: 'Payment Completed', date: t.payment.updatedAt, done: true });
      } else if (t.payment.status === 'FAILED') {
        timeline.push({
          status: 'Payment Failed',
          date: t.payment.updatedAt,
          done: true,
          note: t.payment.failureReason,
        });
      } else if (t.payment.status === 'REFUNDED') {
        timeline.push({ status: 'Refunded', date: t.payment.updatedAt, done: true });
      }
    }

    if (t.vendorPayout || t.riderPayout) {
      const payout = t.vendorPayout ?? t.riderPayout;
      timeline.push({ status: 'Payout Requested', date: payout.createdAt, done: true });

      if (payout.status === 'PAID') {
        timeline.push({
          status: 'Transferred to Bank',
          date: payout.processedAt ?? null,
          done: payout.processedAt != null,
        });
      } else if (payout.status === 'FAILED') {
        timeline.push({
          status: 'Transfer Failed',
          date: payout.processedAt ?? null,
          done: true,
        });
      }
    }

    if (t.status === 'COMPLETED' && timeline.length === 1) {
      timeline.push({ status: 'Processed', date: t.createdAt, done: true });
    }

    return timeline;
  }

  // =========================================================================
  // PRIVATE — MAPPING HELPERS
  // =========================================================================

  private mapFrontendStatusToDb(status: string): string {
    const map: Record<string, string> = {
      Success: 'COMPLETED',
      Processing: 'PENDING',
      Failed: 'FAILED',
      Refunded: 'REVERSED',
    };
    return map[status] ?? status;
  }

  private mapDbStatusToFrontend(status: string): string {
    const map: Record<string, string> = {
      COMPLETED: 'Success',
      PENDING: 'Processing',
      FAILED: 'Failed',
      REVERSED: 'Reversed',
    };
    return map[status] ?? status;
  }

  /**
   * ADJUSTMENT is intentionally excluded from both Credit and Debit type
   * filters because a single ADJUSTMENT record can be either depending on the
   * sign of its `amount`. Sign-based classification happens at the list-item
   * level via `isCredit = t.amount >= 0`.
   *
   * To allow filtering adjustments, add a dedicated 'Adjustment' option in the
   * UI that maps to TransactionType.ADJUSTMENT, rather than bucketing by sign
   * here where the DB query cannot filter on amount sign efficiently.
   */
  private getTransactionTypesByFilter(filter: string): string[] {
    if (filter === 'Credit') {
      return [
        TransactionType.PAYMENT_RECEIVED,
        TransactionType.WALLET_TOPUP,
        TransactionType.VENDOR_EARNING,
        TransactionType.RIDER_EARNING,
      ];
    }
    if (filter === 'Debit') {
      return [
        TransactionType.COMMISSION_DEDUCTED,
        TransactionType.PAYOUT_REQUESTED,
        TransactionType.PAYOUT_COMPLETED,
        TransactionType.REFUND_ISSUED,
      ];
    }
    return [];
  }

  private formatTransactionType(type: string): string {
    const map: Record<string, string> = {
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
    return map[type] ?? type;
  }
}