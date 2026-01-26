import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DeliveryFilterDto } from './dto/delivery-filter.dto';
import { Prisma, DeliveryStatus } from '@prisma/client';
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: TransactionLedgerService,
  ) {}

  async findAll(params: DeliveryFilterDto) {
    const { status, riderId, from, to, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (riderId) where.riderId = riderId; // Ensure riderId is added to your DTO

    if (from && to) {
      where.createdAt = {
        gte: new Date(from),
        lte: new Date(to),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              store: { select: { name: true } },
            },
          },
          // Select direct fields from Rider
          rider: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          customer: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        order: {
          include: {
            store: {
              select: {
                name: true,
                address: true,
                vendor: { select: { phone: true } },
              },
            },
          },
        },
        rider: {
          include: {
            vehicle: true,
          },
        },
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (!delivery) throw new NotFoundException(`Delivery #${id} not found`);

    return this.transformForDetail(delivery);
  }

  async completeDelivery(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        rider: { select: { id: true } },
        order: {
          include: {
            payment: true,
            user: { select: { id: true } },
          },
        },
      },
    });

    if (!delivery) throw new NotFoundException('Delivery not found');
    if (delivery.status === 'DELIVERED') {
      throw new BadRequestException('Delivery already completed');
    }
    if (!delivery.rider) {
      throw new BadRequestException('Delivery has no assigned rider');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update delivery status
      const updatedDelivery = await tx.delivery.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });

      // 2. Record delivery earnings in ledger
      // Note: Delivery fee comes from the delivery record
      const deliveryFee = delivery.deliveryFee || 0;

      if (deliveryFee > 0 && delivery.rider) {
        await this.ledgerService.recordDeliveryEarnings({
          id: delivery.id,
          riderId: delivery.rider.id,
          deliveryFee,
        });
      }

      // 3. If this delivery is part of an order, complete the order too
      if (delivery.orderId && delivery.order) {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
          },
        });

        // Record order payment and commission if payment exists
        if (
          delivery.order.payment &&
          delivery.order.payment.status === 'COMPLETED'
        ) {
          await this.ledgerService.recordPayment({
            id: delivery.order.payment.id,
            amount: delivery.order.payment.amount,
            userId: delivery.order.user.id,
            orderId: delivery.orderId,
            method: delivery.order.payment.method,
            status: delivery.order.payment.status,
          });

          // Record order commission (if order has store)
          const order = await tx.order.findUnique({
            where: { id: delivery.orderId },
            include: { store: { select: { id: true, commissionRate: true } } },
          });

          if (order?.store) {
            await this.ledgerService.recordOrderCommission({
              id: order.id,
              storeId: order.store.id,
              total: delivery.order.total,
              commissionRate: order.store.commissionRate || 20,
            });
          }
        }
      }

      // 4. Log activity
      await tx.activityLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'DELIVERY_COMPLETED',
          target: id,
          metadata: {
            completedAt: new Date().toISOString(),
            deliveryFee,
            orderId: delivery.orderId,
          },
        },
      });

      return updatedDelivery;
    });
  }

  // 🚫 4. Cancel/Delete Delivery
  async remove(id: string, adminUserId?: string, reason?: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            payment: true,
            user: { select: { id: true } },
          },
        },
      },
    });

    if (!delivery) throw new NotFoundException('Delivery not found');

    if (delivery.status === 'DELIVERED') {
      throw new BadRequestException('Cannot delete a completed delivery');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Cancel the delivery
      await tx.delivery.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // 2. If this delivery has an associated order, cancel it too
      if (delivery.orderId && delivery.order) {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        });

        // Process refund if payment was completed
        if (
          delivery.order.payment &&
          delivery.order.payment.status === 'COMPLETED'
        ) {
          await tx.payment.update({
            where: { id: delivery.order.payment.id },
            data: { status: 'REFUNDED' },
          });

          await this.ledgerService.recordRefund({
            id: delivery.order.payment.id,
            amount: delivery.order.payment.amount,
            userId: delivery.order.user.id,
            ...(delivery.orderId && { orderId: delivery.orderId }),
          });
        }
      }

      // 3. Log activity
      await tx.activityLog.create({
        data: {
          userId: adminUserId || 'SUPER_ADMIN',
          action: 'DELIVERY_CANCELLED',
          target: id,
          metadata: {
            reason: reason || 'Cancelled by admin',
            orderId: delivery.orderId,
            refunded: delivery.order?.payment?.status === 'COMPLETED',
          },
        },
      });
    });
  }

  // 💰 5. Process Delivery Refund (for standalone deliveries)
  async refundDelivery(id: string, refundAmount?: number, reason?: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            payment: true,
            user: { select: { id: true } },
          },
        },
      },
    });

    if (!delivery) throw new NotFoundException('Delivery not found');

    // Check if order exists
    if (!delivery.order) {
      throw new BadRequestException(
        'No associated order found for this delivery',
      );
    }

    // Check if payment exists
    if (!delivery.order.payment) {
      throw new BadRequestException('No payment found for this delivery');
    }

    if (delivery.order.payment.status !== 'COMPLETED') {
      throw new BadRequestException('Can only refund completed payments');
    }

    const amountToRefund = refundAmount || delivery.order.payment.amount;

    if (amountToRefund > delivery.order.payment.amount) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    return this.prisma.$transaction(async (tx) => {
      // Safe to use non-null assertion here because we checked above
      const payment = delivery.order!.payment!;

      // Update payment status
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status:
            amountToRefund === payment.amount
              ? 'REFUNDED'
              : 'PARTIALLY_REFUNDED',
        },
      });

      // Record refund in ledger
      await this.ledgerService.recordRefund({
        id: payment.id,
        amount: amountToRefund,
        userId: delivery.order!.user.id,
        ...(delivery.orderId && { orderId: delivery.orderId }),
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: 'ADMIN',
          action: 'REFUND_ISSUED',
          target: id,
          metadata: {
            amount: amountToRefund,
            reason: reason || 'Refund processed',
            isPartial: amountToRefund < payment.amount,
          },
        },
      });
    });
  }

  // --- Transformation Helpers ---

  private inferType(weight: number, isFragile: boolean): string {
    if (weight > 50) return 'Freight';
    if (isFragile) return 'Fragile Parcel';
    if (weight < 1) return 'Document';
    return 'Parcel';
  }

  private transformForList = (d: any) => {
    return {
      id: d.id,
      type: this.inferType(d.weightKg || 0, d.isFragile),
      sender: d.order?.store?.name || d.customer.name,
      recipient: d.recipientName,
      driver: d.rider?.user?.name || '-',
      status:
        d.status === 'PICKED_UP'
          ? 'In Transit'
          : d.status === 'ASSIGNED'
            ? 'Pending Pickup'
            : d.status === 'REQUESTED'
              ? 'Pending Pickup'
              : d.status.charAt(0) + d.status.slice(1).toLowerCase(),
      pickup: d.pickupAddress.city || d.pickupAddress.street,
      dropoff: d.dropoffAddress.city || d.dropoffAddress.street,
      eta: d.deliveredAt ? 'Delivered' : 'Est. 2 hrs',
    };
  };

  private transformForDetail = (d: any) => {
    return {
      id: d.id,
      status:
        d.status === 'PICKED_UP'
          ? 'In Transit'
          : d.status === 'ASSIGNED'
            ? 'Pending Pickup'
            : d.status.charAt(0) + d.status.slice(1).toLowerCase(),
      created: d.createdAt.toISOString(),
      eta: d.deliveredAt ? 'Arrived' : 'Calculated based on traffic',
      type: this.inferType(d.weightKg || 0, d.isFragile),

      package: {
        weight: `${d.weightKg || 0} kg`,
        dims: 'N/A',
        contents: d.packageDetails || 'No details',
        fragile: d.isFragile,
      },

      sender: d.order
        ? {
            name: d.order.store.name,
            address: d.order.store.address || 'N/A',
            phone: d.order.store.owner?.phone || 'N/A',
          }
        : {
            name: d.customer.name,
            address: d.pickupAddress.street,
            phone: d.customer.phone,
          },

      recipient: {
        name: d.recipientName,
        address: `${d.dropoffAddress.street}, ${d.dropoffAddress.city}`,
        phone: d.recipientPhone,
        instructions: 'N/A',
      },

      courier: d.rider
        ? {
            name: d.rider.user.name,
            id: d.rider.id,
            vehicle: d.rider.vehicle
              ? `${d.rider.vehicle.color} ${d.rider.vehicle.model}`
              : 'Unknown',
            phone: d.rider.user.phone,
          }
        : null,

      history: [
        {
          status: 'Request Created',
          loc: 'System',
          time: d.createdAt,
          done: true,
        },
        {
          status: 'Driver Assigned',
          loc: 'System',
          time: d.assignedAt,
          done: !!d.assignedAt,
        },
        {
          status: 'Picked Up',
          loc: d.pickupAddress.street,
          time: d.pickedUpAt,
          done: !!d.pickedUpAt,
        },
        {
          status: 'Delivered',
          loc: d.dropoffAddress.street,
          time: d.deliveredAt,
          done: !!d.deliveredAt,
        },
      ],
    };
  };
}
