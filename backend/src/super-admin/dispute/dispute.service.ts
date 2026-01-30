import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { UserRole } from '@prisma/client';
import { AddMessageDto } from './dto/add-message.dto';
import { PaymentService } from 'src/payment/payment.service';
import {
  ResolveDisputeDto,
  ResolutionAction,
  RefundSource,
} from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);
  constructor(
    private prisma: PrismaService,
    private ledger: TransactionLedgerService,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
  ) {}

// ==================== CREATE DISPUTE ====================
  async create(dto: CreateDisputeDto, userId: string) {
    // 1. Validate Business Rules (Time limits, ownership, status)
    await this.validateDisputeEligibility(dto, userId);

    // 2. Check for Duplicates
    const existingDispute = await this.checkExistingDispute(dto);
    if (existingDispute) {
      throw new BadRequestException(
        'An open dispute already exists for this transaction',
      );
    }

    let paymentId: string | undefined;

    // 3. Resolve Payment ID & Data Integrity Checks
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        include: { payment: true },
      });

      //  INVARIANT CHECK: Order is processed but has no payment record
      if (order && !order.payment && order.paymentStatus !== 'PENDING') {
        throw new BadRequestException(
          'System Error: This order is confirmed but has no payment record. Please contact support.',
        );
      }

      paymentId = order?.payment?.id;
    } else if (dto.rideId) {
      const ride = await this.prisma.ride.findUnique({
        where: { id: dto.rideId },
        include: { payment: true },
      });
      paymentId = ride?.payment?.id;
    }

    // 4. Atomic Creation (Dispute + Log)
    return this.prisma.$transaction(async (tx) => {
      // A. Create the Dispute
      const dispute = await tx.dispute.create({
        data: {
          reason: dto.reason,
          description: dto.description,
          priority: dto.priority || 'MEDIUM',
          evidenceImages: dto.evidenceImages || [],
          openedByUser: { connect: { id: userId } },
          // Connect optional relations
          ...(dto.targetUserId && {
            targetUser: { connect: { id: dto.targetUserId } },
          }),
          ...(paymentId && { payment: { connect: { id: paymentId } } }),
          ...(dto.orderId && { order: { connect: { id: dto.orderId } } }),
          ...(dto.rideId && { ride: { connect: { id: dto.rideId } } }),
          ...(dto.deliveryId && {
            delivery: { connect: { id: dto.deliveryId } },
          }),
          // Initial Message
          messages: {
            create: {
              senderId: userId,
              message: `Dispute opened: ${dto.reason}\n\n${dto.description || ''}`,
              isInternal: false,
            },
          },
        },
        include: {
          openedByUser: { select: { id: true, name: true, email: true } },
          order: { select: { id: true, total: true, status: true } },
          ride: { select: { id: true, totalFare: true, status: true } },
          delivery: { select: { id: true, deliveryFee: true, status: true } },
        },
      });

      // B. Create Activity Log
      await tx.activityLog.create({
        data: {
          userId: userId,
          action: 'DISPUTE_OPENED',
          target: `Dispute #${dispute.id.substring(0, 8)}`,
          status: 'SUCCESS',
          details: `Opened dispute for reason: ${dto.reason}`,
          metadata: {
            disputeId: dispute.id,
            priority: dispute.priority,
            category: dto.orderId ? 'ORDER' : dto.rideId ? 'RIDE' : 'DELIVERY',
          },
        },
      });

      this.logger.log(`Dispute ${dispute.id} created by user ${userId}`);
      return dispute;
    });
  }

  // ==================== VALIDATE ELIGIBILITY ====================
  private async validateDisputeEligibility(
    dto: CreateDisputeDto,
    userId: string,
  ) {
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        include: { delivery: true },
      });

      if (!order) throw new NotFoundException('Order not found');
      if (order.userId !== userId) {
        throw new ForbiddenException('You can only dispute your own orders');
      }
      if (!['DELIVERED', 'CANCELLED'].includes(order.status)) {
        throw new BadRequestException(
          'Cannot dispute an order that is still in progress',
        );
      }

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
      if (ride.customerId !== userId) {
        throw new ForbiddenException('You can only dispute your own rides');
      }
      if (!['COMPLETED', 'CANCELLED'].includes(ride.status)) {
        throw new BadRequestException(
          'Cannot dispute a ride that is still in progress',
        );
      }

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
      if (delivery.customerId !== userId) {
        throw new ForbiddenException(
          'You can only dispute your own deliveries',
        );
      }
      if (!['DELIVERED', 'CANCELLED'].includes(delivery.status)) {
        throw new BadRequestException(
          'Cannot dispute a delivery that is still in progress',
        );
      }
    } else {
      throw new BadRequestException(
        'Must specify orderId, rideId, or deliveryId',
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

    const whereClause: any = {};

    if (status && status !== 'All' && status !== 'IN_REVIEW') {
      whereClause.status = status;
    }

    if (priority && priority !== 'All') {
      whereClause.priority = priority;
    }

    // ✅ FIX 1: Cast array to UserRole[] to prevent type mismatch
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
        skip: skip || 0,
        take: take || 10,
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
    // ✅ FIX 2: Cast array to UserRole[]
    const isAdmin = (
      [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.ADMIN_SUPPORT,
        UserRole.ADMIN_MANAGER,
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
        payment: {
          include: {
            order: { include: { items: true, store: true } },
            ride: {
              include: {
                rider: {
                  select: {
                    id: true,
                    name: true,
                    vehicle: true,
                    rating: true,
                    image: true,
                  },
                },
                pickupAddress: true,
                dropoffAddress: true,
              },
            },
          },
        },
        order: {
          include: {
            items: { include: { product: true } },
            store: true,
            delivery: true,
          },
        },
        ride: {
          include: {
            rider: {
              select: { id: true, name: true, vehicle: true, image: true },
            },
            pickupAddress: true,
            dropoffAddress: true,
          },
        },
        delivery: {
          include: {
            rider: {
              select: { id: true, name: true, vehicle: true, image: true },
            },
            pickupAddress: true,
            dropoffAddress: true,
          },
        },
      },
    });

    if (!dispute) throw new NotFoundException(`Dispute ${id} not found`);

    if (!isAdmin) {
      if (
        dispute.openedByUserId !== userId &&
        dispute.targetUserId !== userId
      ) {
        throw new ForbiddenException('You do not have access to this dispute');
      }
    }

    return {
      ...dispute,
      canResolve: isAdmin,
      canAddMessage: dispute.status === 'OPEN',
      hoursOpen: Math.floor(
        (Date.now() - dispute.createdAt.getTime()) / (1000 * 60 * 60),
      ),
      breachedSLA: this.checkSLABreach(dispute),
    };
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

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.status !== 'OPEN') {
      throw new BadRequestException('Cannot add messages to a closed dispute');
    }

    // ✅ FIX 3: Cast array to UserRole[]
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

    if (!canMessage) {
      throw new ForbiddenException('You cannot add messages to this dispute');
    }

    const isInternal = dto.isInternal && isAdmin;

    return this.prisma.disputeMessage.create({
      data: {
        disputeId: id,
        senderId: userId,
        message: dto.message,
        isInternal,
      },
      include: {
        sender: { select: { id: true, name: true, role: true, image: true } },
      },
    });
  }

// ==================== ADD ADMIN NOTE  ====================
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
            create: {
              senderId: adminId,
              message: note,
              isInternal: true,
            },
          },
        },
      });

      // 👇 LOG ACTIVITY
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
 //  RESOLVE DISPUTE 
  // ==================== RESOLVE DISPUTE ====================
  async resolve(id: string, dto: ResolveDisputeDto, adminId: string) {
    this.logger.log(`Admin ${adminId} resolving dispute ${id}`);

    const dispute = await this.findOne(id, adminId, UserRole.SUPER_ADMIN);
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status !== 'OPEN') throw new BadRequestException('Dispute is already closed');

    // Validation: Vendor Wallet logic
    if (dto.refundSource === RefundSource.VENDOR_WALLET && !dispute.orderId) {
      throw new BadRequestException('Vendor wallet refunds are only allowed for order disputes');
    }

    return this.prisma.$transaction(async (tx) => {
      let resolutionText = dto.resolutionNotes;
      let refundAmount = 0;

      // --- 1. REFUND CALCULATION ---
      if (dto.action.includes('REFUND')) {
        const maxRefund =
          dispute.payment?.amount ||
          dispute.order?.total ||
          dispute.ride?.totalFare ||
          dispute.delivery?.deliveryFee ||
          0;

        if (dto.action === ResolutionAction.REFUND_PARTIAL) {
          if (!dto.refundAmount || dto.refundAmount <= 0) {
            throw new BadRequestException('Refund amount must be greater than 0');
          }
          if (dto.refundAmount > maxRefund) {
            throw new BadRequestException(`Refund amount cannot exceed ₦${maxRefund}`);
          }
          refundAmount = dto.refundAmount;
        } else {
          refundAmount = maxRefund;
        }

        // --- 2. PAYMENT GATEWAY INTERACTION ---
        if (refundAmount > 0) {
          const paymentRef = dispute.payment?.reference;

          if (!paymentRef) {
            this.logger.warn(`Dispute ${id} has no payment reference. Recording as internal refund.`);
            resolutionText += ` (Manual Refund - No Gateway Reference)`;
          } else {
            const isTestTransaction = paymentRef.startsWith('PAY-REF-') || paymentRef.startsWith('REF-');

            if (isTestTransaction) {
              this.logger.warn(`Skipping Gateway Refund for Test Transaction: ${paymentRef}`);
            } else {
              try {
                this.logger.log(`Initiating Gateway Refund: ${paymentRef} | Amount: ₦${refundAmount}`);
                
                await this.paymentService.processRefund(
                  {
                    paymentReference: paymentRef,
                    amount: refundAmount,
                    reason: `Resolution for Dispute ${id}`,
                    metadata: { disputeId: id, refundType: dto.action },
                  },
                  adminId,
                );
              } catch (error) {
                this.logger.error(`Gateway Refund Failed: ${error.message}`, error.stack);
                throw new BadRequestException(`Payment Gateway Failed: ${error.message}`);
              }
            }
          }
        }

        const customerId = dispute.openedByUserId;

        // --- 3. PLATFORM LEDGER ENTRY ---
        await tx.transaction.create({
          data: {
            type: 'REFUND_ISSUED',
            amount: refundAmount,
            status: 'COMPLETED',
            description: `Refund for Dispute #${id.substring(0, 8)}`,
            entityType: 'PLATFORM',
            balanceBefore: 0, 
            balanceAfter: 0,
            ...(dispute.paymentId && { paymentId: dispute.paymentId }),
            ...(dispute.orderId && { orderId: dispute.orderId }),
            ...(dispute.rideId && { rideId: dispute.rideId }),
            ...(dispute.deliveryId && { deliveryId: dispute.deliveryId }),
            
            processedBy: adminId, 

            metadata: {
              disputeId: id,
              refundSource: dto.refundSource,
              customerId: customerId,
              adminId: adminId,
            },
          },
        });

        if (dispute.paymentId) {
          const newStatus = dto.action === ResolutionAction.REFUND_FULL ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
          await tx.payment.update({
            where: { id: dispute.paymentId },
            data: { status: newStatus },
          });
        }

        // --- 4. VENDOR WALLET ADJUSTMENT ---
        if (dto.refundSource === RefundSource.VENDOR_WALLET && dispute.order?.storeId) {
          const store = await tx.store.findUnique({
            where: { id: dispute.order.storeId },
            select: { walletBalance: true },
          });

          if ((store?.walletBalance || 0) < refundAmount) {
            throw new BadRequestException('Vendor wallet has insufficient balance for refund');
          }

          const currentBalance = store?.walletBalance || 0;

          await tx.store.update({
            where: { id: dispute.order.storeId },
            data: { walletBalance: { decrement: refundAmount } },
          });

          await tx.transaction.create({
            data: {
              type: 'ADJUSTMENT',
              amount: -refundAmount,
              entityType: 'STORE',
              entityId: dispute.order.storeId,
              status: 'COMPLETED',
              description: `Refund deduction for Dispute #${id.substring(0, 8)}`,
              balanceBefore: currentBalance,
              balanceAfter: currentBalance - refundAmount,
              processedBy: adminId,
              metadata: { disputeId: id, reason: 'dispute_refund' },
            },
          });
        }

        resolutionText += ` | Refunded: ₦${refundAmount.toFixed(2)} via ${dto.refundSource}`;
      }

      // --- 5. FINALIZE DISPUTE ---
      const updatedDispute = await tx.dispute.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolution: resolutionText,
          refundAmount: refundAmount || 0,
          messages: {
            create: {
              senderId: adminId,
              message: `━━━━━━━━━━━━━━━━━━━━
🔨 DISPUTE RESOLVED

Action: ${dto.action}
${refundAmount > 0 ? `Refund: ₦${refundAmount.toFixed(2)}` : ''}

Notes:
${dto.resolutionNotes}
━━━━━━━━━━━━━━━━━━━━`,
              isInternal: false,
            },
          },
        },
        include: {
          openedByUser: true,
          order: true,
          ride: true,
          delivery: true,
        },
      });

      // --- 6. LOG ACTIVITY (NEW) ---
      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: 'DISPUTE_RESOLVED',
          target: `Dispute #${id.substring(0, 8)}`,
          status: 'SUCCESS',
          details: `Resolved with action: ${dto.action}. Notes: ${dto.resolutionNotes}`,
          metadata: {
            disputeId: id,
            refundAmount,
            refundSource: dto.refundSource,
            resolutionAction: dto.action,
          },
        },
      });

      this.logger.log(`Dispute ${id} resolved successfully.`);
      return updatedDispute;
    });
  }
  //  REJECT DISPUTE 
  async reject(id: string, reason: string, adminId: string) {
    this.logger.log(`Admin ${adminId} rejecting dispute ${id}`);

    const dispute = await this.prisma.dispute.findUnique({ where: { id } });

    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status !== 'OPEN') {
      throw new BadRequestException('Dispute is already closed');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Dispute Status
      const updatedDispute = await tx.dispute.update({
        where: { id },
        data: {
          status: 'REJECTED',
          resolvedAt: new Date(),
          resolution: reason,
          messages: {
            create: {
              senderId: adminId,
              message: `DISPUTE REJECTED

Reason:
${reason}
━━━━━━━━━━━━━━━━━━━━`,
              isInternal: false,
            },
          },
        },
      });

      // 2. Log Activity
      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: 'DISPUTE_REJECTED',
          target: `Dispute #${id.substring(0, 8)}`,
          status: 'SUCCESS',
          details: `Rejected with reason: ${reason}`,
          metadata: {
            disputeId: id,
            reason: reason,
          },
        },
      });

      this.logger.log(`Dispute ${id} rejected successfully.`);
      return updatedDispute;
    });
  }

  // ==================== UPDATE PRIORITY (NEW) ====================
  async updatePriority(id: string, priority: string, adminId: string) {
    // Validate Priority Enum (Optional if DTO handles it, but good safety)
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(priority)) {
      throw new BadRequestException('Invalid priority level');
    }

    return this.prisma.$transaction(async (tx) => {
      const oldDispute = await tx.dispute.findUnique({ where: { id } });
      if (!oldDispute) throw new NotFoundException('Dispute not found');

      const updatedDispute = await tx.dispute.update({
        where: { id },
        data: { priority: priority as any }, // Cast to Enum
      });

      // 👇 LOG ACTIVITY
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
            newPriority: priority 
          },
        },
      });

      this.logger.log(`Priority for Dispute ${id} updated to ${priority} by ${adminId}`);
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
