import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { UserRole } from '@prisma/client';
import { AddMessageDto } from './dto/add-message.dto';
import { PaymentService } from 'src/payment/payment.service';
import { DisputePriority } from '@prisma/client';
import { NotificationsService } from 'src/notifications/notifications.service';
import {
  ResolveDisputeDto,
  ResolutionAction,
  RefundSource,
} from './dto/resolve-dispute.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    private prisma: PrismaService,
    private ledger: TransactionLedgerService,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
    private notificationsService: NotificationsService,
  ) {}

  // ==================== CREATE DISPUTE ====================
  async create(userId: string, dto: CreateDisputeDto) {
    if (!dto.orderId && !dto.rideId && !dto.deliveryId) {
      throw new BadRequestException(
        'A dispute must be linked to an Order, Ride, or Delivery.',
      );
    }

    // Check strict eligibility rules (Time limits, ownership, status)
    await this.validateDisputeEligibility(dto, userId);

    // Check for duplicate open disputes
    const existing = await this.checkExistingDispute(dto);
    if (existing) {
      throw new BadRequestException(
        'An open dispute already exists for this transaction.',
      );
    }

    let targetUserEmail: string | undefined;
    let priority: DisputePriority = DisputePriority.MEDIUM;

    // Resolve Target User (Who is being reported?)
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        include: { store: { include: { vendor: true } } },
      });
      targetUserEmail = order?.store?.vendor?.email;
    } else if (dto.rideId) {
      const ride = await this.prisma.ride.findUnique({
        where: { id: dto.rideId },
        include: { rider: true },
      });
      targetUserEmail = ride?.rider?.email;
    } else if (dto.deliveryId) {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: dto.deliveryId },
        include: { rider: true },
      });
      targetUserEmail = delivery?.rider?.email;
    }

    // Look up Target User ID
    let targetUserId: string | null = null;
    if (targetUserEmail) {
      const targetUser = await this.prisma.user.findUnique({
        where: { email: targetUserEmail },
        select: { id: true },
      });
      targetUserId = targetUser?.id || null;
    }

    // Dynamic Priority Assignment based on keywords
    const sensitiveKeywords = [
      'safety',
      'accident',
      'harassment',
      'assault',
      'threat',
      'emergency',
      'injury',
      'police',
      'danger',
      'reckless',
    ];
    const highKeywords = [
      'stolen',
      'fraud',
      'missing',
      'aggressive',
      'stealing',
    ];
    const combinedText = `${dto.reason} ${dto.description}`.toLowerCase();

    if (sensitiveKeywords.some((word) => combinedText.includes(word))) {
      priority = DisputePriority.URGENT;
    } else if (highKeywords.some((word) => combinedText.includes(word))) {
      priority = DisputePriority.HIGH;
    }

    const dispute = await this.prisma.dispute.create({
      data: {
        reason: dto.reason,
        description: dto.description,
        evidenceImages: dto.evidenceImages || [],
        priority,
        status: 'OPEN',
        openedByUserId: userId,
        targetUserId,
        orderId: dto.orderId,
        rideId: dto.rideId,
        deliveryId: dto.deliveryId,
      },
    });

    return dispute;
  }

  // ==================== VALIDATE ELIGIBILITY ====================
  private async validateDisputeEligibility(
    dto: CreateDisputeDto,
    userId: string,
  ) {
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
      });
      if (!order) throw new NotFoundException('Order not found');
      if (order.userId !== userId)
        throw new ForbiddenException('You can only dispute your own orders');

      const daysSinceDelivery = order.deliveredAt
        ? Math.floor(
            (Date.now() - order.deliveredAt.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 0;
      if (order.deliveredAt && daysSinceDelivery > 7) {
        throw new BadRequestException(
          'Disputes must be filed within 7 days of delivery',
        );
      }
    } else if (dto.rideId) {
      const ride = await this.prisma.ride.findUnique({
        where: { id: dto.rideId },
      });
      if (!ride) throw new NotFoundException('Ride not found');
      if (ride.customerId !== userId)
        throw new ForbiddenException('You can only dispute your own rides');

      const hoursSinceRide = ride.completedAt
        ? Math.floor(
            (Date.now() - ride.completedAt.getTime()) / (1000 * 60 * 60),
          )
        : 0;
      if (ride.completedAt && hoursSinceRide > 24) {
        throw new BadRequestException(
          'Disputes must be filed within 24 hours of ride completion',
        );
      }
    } else if (dto.deliveryId) {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: dto.deliveryId },
      });
      if (!delivery) throw new NotFoundException('Delivery not found');
      if (delivery.customerId !== userId)
        throw new ForbiddenException(
          'You can only dispute your own deliveries',
        );
    }
  }

  // ==================== CHECK EXISTING DISPUTE ====================
  private async checkExistingDispute(dto: CreateDisputeDto) {
    return this.prisma.dispute.findFirst({
      where: {
        status: 'OPEN',
        OR: [
          ...(dto.orderId ? [{ orderId: dto.orderId }] : []),
          ...(dto.rideId ? [{ rideId: dto.rideId }] : []),
          ...(dto.deliveryId ? [{ deliveryId: dto.deliveryId }] : []),
        ],
      },
    });
  }

  // ==================== LIST DISPUTES ====================
  async findAll(params: {
    skip?: number;
    take?: number;
    status?: string;
    priority?: string;
    search?: string;
    userId?: string;
    role?: string;
  }) {
    const { skip, take, status, priority, search, userId, role } = params;

    const skipInt = skip ? Number(skip) : 0;
    const takeInt = take ? Number(take) : 10;

    const whereClause: any = {};

    if (status && status !== 'All' && status !== 'IN_REVIEW') {
      whereClause.status = status;
    }

    if (priority && priority !== 'All') {
      whereClause.priority = priority;
    }

    const isAdmin = (
      [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.ADMIN_SUPPORT,
        UserRole.ADMIN_MANAGER,
      ] as UserRole[]
    ).includes(role as UserRole);

    if (!isAdmin && userId) {
      whereClause.openedByUserId = userId;
    }

    if (search) {
      whereClause.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
        { openedByUser: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.dispute.findMany({
        skip: skipInt,
        take: takeInt,
        where: whereClause,
        include: {
          openedByUser: {
            select: { id: true, name: true, email: true, role: true },
          },
          targetUser: { select: { id: true, name: true, role: true } },
          order: { select: { id: true, total: true, status: true } },
          ride: { select: { id: true, totalFare: true, status: true } },
          delivery: { select: { id: true, deliveryFee: true, status: true } },
          payment: { select: { id: true, amount: true, status: true } },
          _count: { select: { messages: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.dispute.count({ where: whereClause }),
    ]);

    return {
      data: data.map((d) => {
        const amount =
          d.order?.total || d.ride?.totalFare || d.delivery?.deliveryFee || 0;
        const category = d.order
          ? 'Order'
          : d.ride
            ? 'Ride'
            : d.delivery
              ? 'Delivery'
              : 'General';
        const parties = `${d.openedByUser?.name || 'Unknown'} vs ${d.targetUser?.name || 'Platform'}`;

        return {
          ...d,
          category,
          relatedAmount: amount.toFixed(2),
          parties,
          messageCount: d._count.messages,
          isUrgent: d.priority === 'URGENT',
          hoursOpen: Math.floor(
            (Date.now() - d.createdAt.getTime()) / (1000 * 60 * 60),
          ),
          breachedSLA: this.checkSLABreach(d),
        };
      }),
      total,
    };
  }

  // ==================== FIND EXISTING DISPUTE FOR ENTITY ====================
  async findExistingDispute(
    userId: string,
    orderId?: string,
    rideId?: string,
    deliveryId?: string,
  ) {
    const whereClause: any = { openedByUserId: userId };
    if (orderId) whereClause.orderId = orderId;
    else if (rideId) whereClause.rideId = rideId;
    else if (deliveryId) whereClause.deliveryId = deliveryId;
    else return { dispute: null };

    const dispute = await this.prisma.dispute.findFirst({
      where: whereClause,
      include: {
        openedByUser: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { dispute };
  }

  // ==================== CHECK SLA BREACH ====================
  private checkSLABreach(dispute: any): boolean {
    const hoursOpen = Math.floor(
      (Date.now() - dispute.createdAt.getTime()) / (1000 * 60 * 60),
    );
    const slaHours: Record<string, number> = {
      URGENT: 4,
      HIGH: 24,
      MEDIUM: 48,
      LOW: 72,
    };
    return hoursOpen > (slaHours[dispute.priority] || 72);
  }

  // ==================== GET SINGLE DISPUTE ====================
  async findOne(id: string, userId: string, role: string | UserRole) {
    const isAdmin = (
      [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN_MANAGER,
        UserRole.ADMIN_SUPPORT,
      ] as UserRole[]
    ).includes(role as UserRole);

    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        openedByUser: true,
        targetUser: true,
        messages: {
          where: isAdmin ? {} : { isInternal: false },
          include: {
            sender: {
              select: { id: true, name: true, role: true, image: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        order: {
          include: {
            items: { include: { product: true } },
            store: true,
            delivery: true,
            payment: true,
            orderGroup: {
              include: {
                payment: true,
                orders: { include: { store: { select: { name: true } } } },
              },
            },
          },
        },
        payment: true,
        ride: {
          include: {
            rider: true,
            pickupAddress: true,
            dropoffAddress: true,
            payment: true,
          },
        },
        delivery: {
          include: {
            rider: true,
            pickupAddress: true,
            dropoffAddress: true,
            payment: true,
          },
        },
      },
    });

    if (!dispute) throw new NotFoundException(`Dispute ${id} not found`);

    const effectivePayment =
      dispute.payment ||
      dispute.order?.payment ||
      dispute.order?.orderGroup?.payment ||
      dispute.ride?.payment ||
      dispute.delivery?.payment;

    const siblings =
      dispute.order?.orderGroup?.orders.filter(
        (o) => o.id !== dispute.orderId,
      ) || [];

    return {
      ...dispute,
      effectivePayment,
      siblings,
      canResolve: isAdmin,
      canAddMessage: dispute.status === 'OPEN',
      hoursOpen: Math.floor(
        (Date.now() - dispute.createdAt.getTime()) / (1000 * 60 * 60),
      ),
      breachedSLA: this.checkSLABreach(dispute),
    };
  }

  // ==================== RESOLVE DISPUTE (TWO-PHASE FLOW) ====================
  async resolve(id: string, dto: ResolveDisputeDto, adminId: string) {
    this.logger.log(`[Dispute ${id}] Resolution started by Admin ${adminId}`);

    // 1. Initial Validation
    const dispute = await this.findOne(id, adminId, 'SUPER_ADMIN');
    if (!dispute) throw new NotFoundException('Dispute not found');

    // Strict Guard: Prevent resolving closed disputes
    if (dispute.status !== 'OPEN') {
      throw new BadRequestException(`Dispute is already ${dispute.status}`);
    }

    // Check for concurrency lock (Requires Schema Update)
    if ((dispute as any).refundStatus === 'PROCESSING') {
      throw new ConflictException(
        'A refund is currently processing for this dispute. Please check logs/gateway.',
      );
    }

    // 2. Determine Resolution Path
    const isRefundAction = dto.action.includes('REFUND');

    if (isRefundAction) {
      return this.executeSafeRefundFlow(dispute, dto, adminId);
    } else {
      return this.executeStandardResolution(dispute, dto, adminId);
    }
  }

  /**
   * EXECUTE SAFE REFUND (PHASE 1, 2, 3)
   */
  private async executeSafeRefundFlow(
    dispute: any,
    dto: ResolveDisputeDto,
    adminId: string,
  ) {
    // A. Validation & Calculation
    if (dto.refundSource === RefundSource.VENDOR_WALLET && !dispute.orderId) {
      throw new BadRequestException(
        'Vendor wallet refunds are only allowed for order disputes',
      );
    }

    const effectivePayment = dispute.effectivePayment;
    const isGroupTransaction = !!dispute.order?.orderGroupId;

    const maxRefund =
      dispute.order?.total ||
      dispute.ride?.totalFare ||
      dispute.delivery?.deliveryFee ||
      effectivePayment?.amount ||
      0;

    let refundAmount = 0;
    if (dto.action === ResolutionAction.REFUND_PARTIAL) {
      if (!dto.refundAmount || dto.refundAmount <= 0)
        throw new BadRequestException('Refund amount must be greater than 0');
      if (dto.refundAmount > maxRefund)
        throw new BadRequestException(
          `Refund amount cannot exceed ₦${maxRefund}`,
        );
      refundAmount = dto.refundAmount;
    } else {
      refundAmount = maxRefund;
    }

    if (refundAmount <= 0)
      throw new BadRequestException('Refund amount invalid');
    if (!effectivePayment?.reference)
      throw new BadRequestException(
        'No valid payment reference found for refund.',
      );

    const idempotencyKey = `refund_${dispute.id}_${randomUUID()}`;

    // --- PHASE 1: INTENT LOCK (DB Transaction) ---
    // Lock the row to prevent double-clicks
    await this.prisma.dispute.update({
      where: { id: dispute.id },
      data: {
        // @ts-ignore - Requires schema update
        refundStatus: 'PROCESSING',
        refundIdempotencyKey: idempotencyKey,
      },
    });

    let gatewayResponse: { refundReference: string } | null = null;
    // --- PHASE 2: EXTERNAL EXECUTION (NO Transaction) ---
    try {
      this.logger.log(
        `[Dispute ${dispute.id}] Initiating Gateway Refund. Key: ${idempotencyKey}`,
      );

      const isTestTransaction =
        effectivePayment.reference.startsWith('PAY-REF-') ||
        effectivePayment.reference.startsWith('REF-');

      if (!isTestTransaction) {
        gatewayResponse = await this.paymentService.processRefund(
          {
            paymentReference: effectivePayment.reference,
            amount: refundAmount,
            reason: `Dispute Resolution: ${dispute.id}`,
            metadata: {
              disputeId: dispute.id,
              idempotencyKey,
              refundType: dto.action,
              isPartial: isGroupTransaction,
              targetOrderId: dispute.orderId,
            },
          },
          adminId,
        );
      } else {
        this.logger.warn(
          `[Dispute ${dispute.id}] Skipping gateway call for Test Transaction`,
        );
        gatewayResponse = { refundReference: 'TEST-REFUND-' + randomUUID() };
      }
    } catch (error) {
      this.logger.error(
        `[Dispute ${dispute.id}] Refund Failed: ${error.message}`,
        error.stack,
      );

      // Rollback Lock (Phase 2b - Failure Recovery)
      await this.prisma.dispute.update({
        where: { id: dispute.id },
        data: {
          // @ts-ignore
          refundStatus: 'FAILED',
          adminNotes: `${dispute.adminNotes || ''}\n[System] Refund attempt failed: ${error.message}`,
        },
      });

      throw new BadRequestException(
        `Refund execution failed: ${error.message}`,
      );
    }

    // --- PHASE 3: FINALIZATION (DB Transaction) ---
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // A. Ledger Entries
        await this.recordRefundLedger(
          tx,
          dispute,
          refundAmount,
          dto,
          adminId,
          effectivePayment,
        );

        // B. Update Payment Status
        if (effectivePayment) {
          const isFullGroupRefund =
            !isGroupTransaction && dto.action === ResolutionAction.REFUND_FULL;
          await tx.payment.update({
            where: { id: effectivePayment.id },
            data: {
              status: isFullGroupRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
            },
          });
        }

        // C. Finalize Dispute
        const updated = await tx.dispute.update({
          where: { id: dispute.id },
          data: {
            status: 'RESOLVED',
            // @ts-ignore
            refundStatus: 'COMPLETED',
            resolvedAt: new Date(),
            refundAmount,
            resolution: dto.resolutionNotes,
            // @ts-ignore
            gatewayRefundId: gatewayResponse?.refundReference || 'MANUAL',
            messages: {
              create: {
                senderId: adminId,
                message: `✅ Refund Processed: ₦${refundAmount.toFixed(2)}\nRef: ${gatewayResponse?.refundReference || 'N/A'}\n\n${dto.resolutionNotes}`,
                isInternal: false,
              },
            },
          },
          include: { openedByUser: true },
        });

        // D. Activity Log
        await tx.activityLog.create({
          data: {
            userId: adminId,
            action: 'DISPUTE_REFUND_SUCCESS',
            target: `Dispute ${dispute.id}`,
            status: 'SUCCESS',
            details: `Refunded ₦${refundAmount}`,
            metadata: { gatewayRef: gatewayResponse?.refundReference },
          },
        });

        return updated;
      });

      // Send Notification
      if (dispute.openedByUserId) {
        await this.notificationsService
          .sendToUser(dispute.openedByUserId, {
            title: 'Dispute Resolved',
            body: `Your dispute has been resolved with a refund of ₦${refundAmount.toFixed(2)}.`,
            data: { type: 'DISPUTE_UPDATE', disputeId: dispute.id },
          })
          .catch((err) =>
            this.logger.error('Failed to send notification', err),
          );
      }

      return result;
    } catch (dbError) {
      this.logger.error(
        `[Dispute ${dispute.id}] CRITICAL: Gateway Refunded but DB Update Failed!`,
        dbError.stack,
      );
      throw new InternalServerErrorException(
        'Refund successful, but system record update failed. Please contact support do NOT retry.',
      );
    }
  }

  /**
   * STANDARD RESOLUTION (NO REFUND)
   */
  private async executeStandardResolution(
    dispute: any,
    dto: ResolveDisputeDto,
    adminId: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: 'RESOLVED',
          resolution: dto.resolutionNotes,
          resolvedAt: new Date(),
          messages: {
            create: {
              senderId: adminId,
              message: `✅ Dispute Resolved (No Refund)\n\n${dto.resolutionNotes}`,
              isInternal: false,
            },
          },
        },
        include: { openedByUser: true },
      });

      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: 'DISPUTE_RESOLVED',
          target: `Dispute ${dispute.id}`,
          status: 'SUCCESS',
          details: `Resolved with action: ${dto.action}`,
          metadata: { disputeId: dispute.id },
        },
      });
      return updated;
    });

    if (dispute.openedByUserId) {
      await this.notificationsService
        .sendToUser(dispute.openedByUserId, {
          title: 'Dispute Resolved',
          body: `Your dispute has been resolved. Please check the app for details.`,
          data: { type: 'DISPUTE_UPDATE', disputeId: dispute.id },
        })
        .catch((err) => this.logger.error('Failed to send notification', err));
    }

    return result;
  }

  /**
   * RECORD LEDGER ENTRIES
   */
  private async recordRefundLedger(
    tx: any,
    dispute: any,
    amount: number,
    dto: ResolveDisputeDto,
    adminId: string,
    effectivePayment: any,
  ) {
    // 1. Platform Record
    await tx.transaction.create({
      data: {
        type: 'REFUND_ISSUED',
        amount,
        status: 'COMPLETED',
        entityType: 'PLATFORM',
        description: `Refund for Dispute ${dispute.id.substring(0, 8)}`,
        balanceBefore: 0,
        balanceAfter: 0,
        ...(effectivePayment?.id && { paymentId: effectivePayment.id }),
        ...(dispute.orderId && { orderId: dispute.orderId }),
        ...(dispute.order?.orderGroupId && {
          orderGroupId: dispute.order.orderGroupId,
        }),
        ...(dispute.rideId && { rideId: dispute.rideId }),
        ...(dispute.deliveryId && { deliveryId: dispute.deliveryId }),
        processedBy: adminId,
        metadata: { disputeId: dispute.id, source: dto.refundSource },
      },
    });

    // 2. Vendor Wallet Deduction (If applicable)
    if (
      dto.refundSource === RefundSource.VENDOR_WALLET &&
      dispute.order?.storeId
    ) {
      const store = await tx.store.findUnique({
        where: { id: dispute.order.storeId },
        select: { walletBalance: true },
      });

      const currentBalance = store?.walletBalance || 0;

      if (currentBalance < amount) {
        this.logger.warn(
          `Store ${dispute.order.storeId} balance will go negative.`,
        );
      }

      await tx.store.update({
        where: { id: dispute.order.storeId },
        data: { walletBalance: { decrement: amount } },
      });

      await tx.transaction.create({
        data: {
          type: 'ADJUSTMENT',
          amount: -amount,
          entityType: 'STORE',
          entityId: dispute.order.storeId,
          status: 'COMPLETED',
          description: `Refund deduction for Dispute #${dispute.id.substring(0, 8)}`,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance - amount,
          processedBy: adminId,
          metadata: { disputeId: dispute.id, reason: 'dispute_refund' },
        },
      });
    }
  }

  // ==================== REJECT DISPUTE ====================
  async reject(id: string, reason: string, adminId: string) {
    this.logger.log(`Admin ${adminId} rejecting dispute ${id}`);
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });

    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status !== 'OPEN')
      throw new BadRequestException('Dispute is already closed');

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedDispute = await tx.dispute.update({
        where: { id },
        data: {
          status: 'REJECTED',
          resolvedAt: new Date(),
          resolution: reason,
          messages: {
            create: {
              senderId: adminId,
              message: `DISPUTE REJECTED\n\nReason:\n${reason}\n━━━━━━━━━━━━━━━━━━━━`,
              isInternal: false,
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: 'DISPUTE_REJECTED',
          target: `Dispute #${id.substring(0, 8)}`,
          status: 'SUCCESS',
          details: `Rejected with reason: ${reason}`,
          metadata: { disputeId: id, reason: reason },
        },
      });

      return updatedDispute;
    });

    if (dispute.openedByUserId) {
      await this.notificationsService
        .sendToUser(dispute.openedByUserId, {
          title: 'Dispute Update',
          body: `Your dispute has been closed. Reason: ${reason}`,
          data: { type: 'DISPUTE_UPDATE', disputeId: id },
        })
        .catch((err) => this.logger.error('Failed to send notification', err));
    }

    return result;
  }

  // ==================== ADD MESSAGE ====================
  async addMessage(
    id: string,
    dto: AddMessageDto,
    userId: string,
    role: string,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { openedByUser: true, targetUser: true },
    });

    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status !== 'OPEN')
      throw new BadRequestException('Cannot add messages to a closed dispute');

    const isAdmin = (
      [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.ADMIN_SUPPORT,
        UserRole.ADMIN_MANAGER,
      ] as UserRole[]
    ).includes(role as UserRole);

    const canMessage =
      userId === dispute.openedByUserId ||
      userId === dispute.targetUserId ||
      isAdmin;
    if (!canMessage)
      throw new ForbiddenException('You cannot add messages to this dispute');

    return this.prisma.disputeMessage.create({
      data: {
        disputeId: id,
        senderId: userId,
        message: dto.message,
        isInternal: dto.isInternal && isAdmin,
      },
      include: {
        sender: { select: { id: true, name: true, role: true, image: true } },
      },
    });
  }

  // ==================== ADD ADMIN NOTE ====================
  async addAdminNote(id: string, note: string, adminId: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw new NotFoundException('Dispute not found');

    return this.prisma.$transaction(async (tx) => {
      const updatedDispute = await tx.dispute.update({
        where: { id },
        data: {
          adminNotes: dispute.adminNotes
            ? `${dispute.adminNotes}\n\n[${new Date().toISOString()}] ${note}`
            : note,
          messages: {
            create: { senderId: adminId, message: note, isInternal: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: 'DISPUTE_NOTE_ADDED',
          target: `Dispute #${id.substring(0, 8)}`,
          status: 'SUCCESS',
          details: 'Internal admin note added',
          metadata: { disputeId: id },
        },
      });

      return updatedDispute;
    });
  }

  // ==================== UPDATE PRIORITY ====================
  async updatePriority(id: string, priority: string, adminId: string) {
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(priority))
      throw new BadRequestException('Invalid priority level');

    return this.prisma.$transaction(async (tx) => {
      const oldDispute = await tx.dispute.findUnique({ where: { id } });
      if (!oldDispute) throw new NotFoundException('Dispute not found');

      const updatedDispute = await tx.dispute.update({
        where: { id },
        data: { priority: priority as any },
      });

      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: 'DISPUTE_PRIORITY_UPDATED',
          target: `Dispute #${id.substring(0, 8)}`,
          status: 'SUCCESS',
          details: `Priority changed from ${oldDispute.priority} to ${priority}`,
          metadata: {
            disputeId: id,
            oldPriority: oldDispute.priority,
            newPriority: priority,
          },
        },
      });

      return updatedDispute;
    });
  }

  // ==================== GET STATISTICS ====================
  async getStats() {
    const [totalOpen, totalResolved, totalRejected, urgentOpen, breachedSLA] =
      await Promise.all([
        this.prisma.dispute.count({ where: { status: 'OPEN' } }),
        this.prisma.dispute.count({ where: { status: 'RESOLVED' } }),
        this.prisma.dispute.count({ where: { status: 'REJECTED' } }),
        this.prisma.dispute.count({
          where: { status: 'OPEN', priority: 'URGENT' },
        }),
        this.prisma.dispute.findMany({
          where: { status: 'OPEN' },
          select: { priority: true, createdAt: true },
        }),
      ]);

    const breached = breachedSLA.filter((d) => this.checkSLABreach(d)).length;

    return {
      totalOpen,
      totalResolved,
      totalRejected,
      urgentOpen,
      breachedSLA: breached,
      resolutionRate:
        (totalResolved / (totalResolved + totalRejected + totalOpen || 1)) *
        100,
    };
  }
}
