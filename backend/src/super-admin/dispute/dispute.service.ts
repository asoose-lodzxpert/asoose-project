import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { UserRole } from '@prisma/client';
import { AddMessageDto } from './dto/add-message.dto';
import {
  ResolveDisputeDto,
  ResolutionAction,
  RefundSource,
} from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    private prisma: PrismaService,
    private ledger: TransactionLedgerService,
  ) {}

  // ==================== CREATE DISPUTE ====================
  // Fixed: Accepts userId as second argument to match controller
  async create(dto: CreateDisputeDto, userId: string) {
    // 1. Validate eligibility
    await this.validateDisputeEligibility(dto, userId);

    // 2. Check for existing open disputes
    const existingDispute = await this.checkExistingDispute(dto);
    if (existingDispute) {
      throw new BadRequestException(
        'An open dispute already exists for this transaction',
      );
    }

    // 3. Get payment info for linking
    let paymentId: string | undefined;
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        include: { payment: true },
      });
      paymentId = order?.payment?.id;
    } else if (dto.rideId) {
      const ride = await this.prisma.ride.findUnique({
        where: { id: dto.rideId },
        include: { payment: true },
      });
      paymentId = ride?.payment?.id;
    }

    // 4. Create dispute
    return this.prisma.dispute.create({
      data: {
        reason: dto.reason,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        evidenceImages: dto.evidenceImages || [],
        // Fixed: Uses userId param, not dto property
        openedByUser: { connect: { id: userId } },
        ...(dto.targetUserId && {
          targetUser: { connect: { id: dto.targetUserId } },
        }),
        ...(paymentId && { payment: { connect: { id: paymentId } } }),

        // Polymorphic connections
        ...(dto.orderId && { order: { connect: { id: dto.orderId } } }),
        ...(dto.rideId && { ride: { connect: { id: dto.rideId } } }),
        ...(dto.deliveryId && {
          delivery: { connect: { id: dto.deliveryId } },
        }),

        // Initial message
        messages: {
          create: {
            senderId: userId, // Fixed: Uses userId param
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
  // Fixed: Interface includes userId and role
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

    if (status && status !== 'All') {
      whereClause.status = status;
    }

    if (priority && priority !== 'All') {
      whereClause.priority = priority;
    }

    // If not admin, only show user's own disputes
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && userId) {
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
      data: data.map((d) => ({
        ...d,
        messageCount: d._count.messages,
        isUrgent: d.priority === 'URGENT',
        hoursOpen: Math.floor(
          (Date.now() - d.createdAt.getTime()) / (1000 * 60 * 60),
        ),
        breachedSLA: this.checkSLABreach(d),
      })),
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
  // Fixed: Accepts userId and role
async findOne(id: string, userId: string, role: string | UserRole) {
  const dispute = await this.prisma.dispute.findUnique({
    where: { id },
    include: {
      openedByUser: true,
      targetUser: true,
      messages: {
        where: role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN ? {} : { isInternal: false },
        include: { sender: { select: { id: true, name: true, role: true, image: true } } },
        orderBy: { createdAt: 'asc' },
      },
      payment: {
        include: {
          order: { include: { items: true, store: true } },
          ride: {
            include: {
              // Fixed: Access rider fields directly (no 'user' relation)
              rider: { 
                include: { 
                  vehicle: true 
                } 
              },
              pickupAddress: true,
              dropoffAddress: true,
            },
          },
        },
      },
      order: { include: { items: { include: { product: true } }, store: true, delivery: true } },
      ride: { include: { rider: { include: { vehicle: true } }, pickupAddress: true, dropoffAddress: true } },
      delivery: { include: { rider: { include: { vehicle: true } }, pickupAddress: true, dropoffAddress: true } },
    },
  });

  if (!dispute) throw new NotFoundException(`Dispute ${id} not found`);

  // Type-safe check for role
  if (role !== UserRole.SUPER_ADMIN && role !== UserRole.ADMIN) {
    if (dispute.openedByUserId !== userId && dispute.targetUserId !== userId) {
      throw new ForbiddenException('You do not have access to this dispute');
    }
  }

  return {
    ...dispute,
    canResolve: role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN,
    canAddMessage: dispute.status === 'OPEN',
    hoursOpen: Math.floor((Date.now() - dispute.createdAt.getTime()) / (1000 * 60 * 60)),
    breachedSLA: this.checkSLABreach(dispute),
  };
}

  // ==================== ADD MESSAGE ====================
  // Fixed: Accepts userId and role
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

    // Authorization check
    const canMessage =
      userId === dispute.openedByUserId ||
      userId === dispute.targetUserId ||
      role === 'SUPER_ADMIN' ||
      role === 'ADMIN';

    if (!canMessage) {
      throw new ForbiddenException('You cannot add messages to this dispute');
    }

    // Only admins can send internal messages
    const isInternal =
      dto.isInternal && (role === 'SUPER_ADMIN' || role === 'ADMIN');

    return this.prisma.disputeMessage.create({
      data: {
        disputeId: id,
        senderId: userId, // Fixed: Uses userId param
        message: dto.message,
        isInternal,
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

    return this.prisma.dispute.update({
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
  }

  // ==================== RESOLVE DISPUTE ====================
  // Fixed: Accepts adminId as argument
async resolve(id: string, dto: ResolveDisputeDto, adminId: string) {
const dispute = await this.findOne(id, adminId, UserRole.SUPER_ADMIN);
  if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.status !== 'OPEN') {
      throw new BadRequestException('Dispute is already closed');
    }

    // Use Prisma Transaction for atomicity
    return this.prisma.$transaction(async (tx) => {
      let resolutionText = dto.resolutionNotes;
      let refundAmount = 0;

      // ========== HANDLE REFUNDS ==========
      if (dto.action.includes('REFUND')) {
        // Determine refund amount
        const maxRefund =
          dispute.payment?.amount ||
          dispute.order?.total ||
          dispute.ride?.totalFare ||
          dispute.delivery?.deliveryFee ||
          0;

        if (dto.action === ResolutionAction.REFUND_PARTIAL) {
          if (!dto.refundAmount || dto.refundAmount <= 0) {
            throw new BadRequestException(
              'Refund amount must be greater than 0',
            );
          }
          if (dto.refundAmount > maxRefund) {
            throw new BadRequestException(
              `Refund amount cannot exceed ${maxRefund}`,
            );
          }
          refundAmount = dto.refundAmount;
        } else {
          refundAmount = maxRefund;
        }

        // Get customer ID
        const customerId = dispute.openedByUserId;

        // ========== RECORD REFUND IN LEDGER ==========
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
            metadata: {
              disputeId: id,
              refundSource: dto.refundSource,
              adminId: adminId,
              customerId: customerId,
            },
          },
        });

        // ========== UPDATE PAYMENT STATUS ==========
        if (dispute.paymentId) {
          const newStatus =
            dto.action === ResolutionAction.REFUND_FULL
              ? 'REFUNDED'
              : 'PARTIALLY_REFUNDED';

          await tx.payment.update({
            where: { id: dispute.paymentId },
            data: { status: newStatus },
          });
        }

        // ========== DEBIT VENDOR WALLET (if applicable) ==========
        if (
          dto.refundSource === RefundSource.VENDOR_WALLET &&
          dispute.order?.storeId
        ) {
          const store = await tx.store.findUnique({
            where: { id: dispute.order.storeId },
            select: { walletBalance: true },
          });

          if ((store?.walletBalance || 0) < refundAmount) {
            throw new BadRequestException(
              'Vendor wallet has insufficient balance for refund',
            );
          }

          const currentBalance = store?.walletBalance || 0;

          await tx.store.update({
            where: { id: dispute.order.storeId },
            data: { walletBalance: { decrement: refundAmount } },
          });

          // Record wallet debit transaction
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

        resolutionText += ` | Refunded: $${refundAmount.toFixed(2)} via ${dto.refundSource}`;
      }

      // ========== UPDATE DISPUTE ==========
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

Action Taken: ${dto.action}
${refundAmount > 0 ? `Refund Amount: $${refundAmount.toFixed(2)}` : ''}

Admin Notes:
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

      return updatedDispute;
    });
  }

  // ==================== REJECT DISPUTE ====================
  async reject(id: string, reason: string, adminId: string) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });

    if (!dispute) throw new NotFoundException('Dispute not found');
    if (dispute.status !== 'OPEN') {
      throw new BadRequestException('Dispute is already closed');
    }

    return this.prisma.dispute.update({
      where: { id },
      data: {
        status: 'REJECTED',
        resolvedAt: new Date(),
        resolution: reason,
        messages: {
          create: {
            senderId: adminId,
            message: `━━━━━━━━━━━━━━━━━━━━
❌ DISPUTE REJECTED

Reason:
${reason}
━━━━━━━━━━━━━━━━━━━━`,
            isInternal: false,
          },
        },
      },
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
