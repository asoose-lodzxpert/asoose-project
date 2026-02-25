import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { DeliveryFilterDto } from './dto/delivery-filter.dto';
import { Prisma, DeliveryStatus } from '@prisma/client';
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { NotificationsService } from '../../notifications/notifications.service';
import { AppLogger } from 'src/libs/logger/app-logger.service'; // ← added

/** Delivery statuses that can never receive a new rider assignment */
const TERMINAL_DELIVERY_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.DELIVERED,
  DeliveryStatus.CANCELLED,
  DeliveryStatus.FAILED,
];

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: TransactionLedgerService,
    private notificationsGateway: NotificationsGateway,
    private notificationsService: NotificationsService,
    private readonly logger: AppLogger, // ← added
  ) {}

  async findAll(params: DeliveryFilterDto) {
    this.logger.debug(`findAll deliveries - params: ${JSON.stringify(params)}`);

    const { status, riderId, from, to, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== 'All') where.status = status;
    if (riderId) where.riderId = riderId;

    if (from && to) {
      where.createdAt = {
        gte: new Date(from),
        lte: new Date(to),
      };
    }

    this.logger.debug(
      `Executing findMany + count with where: ${JSON.stringify(where)}`,
    );

    const [data, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: {
            include: {
              store: { select: { name: true } },
              items: { include: { product: { select: { name: true } } } },
            },
          },
          rider: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          customer: { select: { name: true, phone: true } },
          pickupAddress: true,
          dropoffAddress: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    this.logger.debug(`Found ${data.length} deliveries (total: ${total})`);

    const transformedData = data.map((d) => this.transformForList(d));

    return {
      data: transformedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    this.logger.debug(`findOne delivery - id: ${id}`);

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

    if (!delivery) {
      this.logger.warn(`Delivery not found: ${id}`);
      throw new NotFoundException(`Delivery #${id} not found`);
    }

    this.logger.debug(`Delivery found: ${id} - status=${delivery.status}`);

    return this.transformForDetail(delivery);
  }

  async completeDelivery(id: string) {
    this.logger.debug(`completeDelivery - id: ${id}`);

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

    if (!delivery) {
      this.logger.warn(`completeDelivery - not found: ${id}`);
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.status === 'DELIVERED') {
      this.logger.warn(`completeDelivery - already delivered: ${id}`);
      throw new BadRequestException('Delivery already completed');
    }
    if (!delivery.rider) {
      this.logger.warn(`completeDelivery - no rider assigned: ${id}`);
      throw new BadRequestException('Delivery has no assigned rider');
    }

    this.logger.debug(`Starting transaction to complete delivery ${id}`);

    return this.prisma.$transaction(async (tx) => {
      const updatedDelivery = await tx.delivery.update({
        where: { id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });

      const deliveryFee = delivery.deliveryFee || 0;

      if (deliveryFee > 0 && delivery.rider) {
        this.logger.debug(
          `Recording delivery earnings for rider ${delivery.rider.id} - fee: ${deliveryFee}`,
        );
        await this.ledgerService.recordDeliveryEarnings({
          id: delivery.id,
          riderId: delivery.rider.id,
          deliveryFee,
        });
      }

      if (delivery.orderId && delivery.order) {
        this.logger.debug(`Completing associated order ${delivery.orderId}`);
        await tx.order.update({
          where: { id: delivery.orderId },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
          },
        });

        if (
          delivery.order.payment &&
          delivery.order.payment.status === 'COMPLETED'
        ) {
          this.logger.debug(
            `Recording payment & commission for order ${delivery.orderId}`,
          );
          await this.ledgerService.recordPayment({
            id: delivery.order.payment.id,
            amount: delivery.order.payment.amount,
            userId: delivery.order.user.id,
            orderId: delivery.orderId,
            method: delivery.order.payment.method,
            status: delivery.order.payment.status,
          });

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

      this.logger.debug(`Logging DELIVERY_COMPLETED activity for ${id}`);
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

      this.logger.debug(`Delivery ${id} completed successfully`);
      return updatedDelivery;
    });
  }

  async updateStatus(id: string, status: DeliveryStatus, adminId: string) {
    this.logger.debug(
      `updateStatus - id: ${id}, new status: ${status}, admin: ${adminId}`,
    );

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

    if (!delivery) {
      this.logger.warn(`updateStatus - delivery not found: ${id}`);
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.status === DeliveryStatus.DELIVERED) {
      this.logger.warn(`Cannot update completed delivery: ${id}`);
      throw new BadRequestException(
        'Cannot change status of a completed delivery',
      );
    }
    if (delivery.status === DeliveryStatus.CANCELLED) {
      this.logger.warn(`Cannot update cancelled delivery: ${id}`);
      throw new BadRequestException(
        'Cannot change status of a cancelled delivery',
      );
    }

    if (status === DeliveryStatus.DELIVERED) {
      this.logger.debug(`Full completion flow triggered for delivery ${id}`);
      return this.prisma.$transaction(async (tx) => {
        const updatedDelivery = await tx.delivery.update({
          where: { id },
          data: { status: DeliveryStatus.DELIVERED, deliveredAt: new Date() },
        });

        const deliveryFee = delivery.deliveryFee || 0;
        if (deliveryFee > 0 && delivery.rider) {
          await this.ledgerService.recordDeliveryEarnings({
            id: delivery.id,
            riderId: delivery.rider.id,
            deliveryFee,
          });
        }

        if (delivery.orderId && delivery.order) {
          await tx.order.update({
            where: { id: delivery.orderId },
            data: { status: 'DELIVERED', deliveredAt: new Date() },
          });

          if (delivery.order.payment?.status === 'COMPLETED') {
            await this.ledgerService.recordPayment({
              id: delivery.order.payment.id,
              amount: delivery.order.payment.amount,
              userId: delivery.order.user.id,
              orderId: delivery.orderId,
              method: delivery.order.payment.method,
              status: delivery.order.payment.status,
            });

            const order = await tx.order.findUnique({
              where: { id: delivery.orderId },
              include: {
                store: { select: { id: true, commissionRate: true } },
              },
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

        await tx.activityLog.create({
          data: {
            userId: adminId,
            action: 'DELIVERY_COMPLETED',
            target: id,
            metadata: {
              completedAt: new Date().toISOString(),
              deliveryFee,
              orderId: delivery.orderId,
              overriddenByAdmin: true,
            },
          },
        });

        return updatedDelivery;
      });
    }

    // Normal status update
    const extraData: any = {};
    if (status === DeliveryStatus.PICKED_UP) extraData.pickedUpAt = new Date();
    if (status === DeliveryStatus.ASSIGNED) extraData.assignedAt = new Date();

    this.logger.debug(`Updating delivery ${id} → ${status}`);

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: { status, ...extraData },
    });

    this.logger.debug(`Logging status change: ${delivery.status} → ${status}`);
    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'DELIVERY_STATUS_UPDATED',
        target: id,
        metadata: {
          previousStatus: delivery.status,
          newStatus: status,
        },
      },
    });

    return updated;
  }

  async assignRider(deliveryId: string, riderId: string, adminId: string) {
    this.logger.debug(
      `assignRider - delivery: ${deliveryId}, rider: ${riderId}, admin: ${adminId}`,
    );

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });
    if (!delivery) {
      this.logger.warn(`assignRider - delivery not found: ${deliveryId}`);
      throw new NotFoundException('Delivery not found');
    }

    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });
    if (!rider) {
      this.logger.warn(`assignRider - rider not found: ${riderId}`);
      throw new NotFoundException('Rider not found');
    }

    if (rider.status !== 'ACTIVE') {
      this.logger.warn(`Rider ${riderId} is not active`);
      throw new BadRequestException('Rider is not active');
    }

    // Guard: prevent double-assignment
    if (delivery.riderId) {
      throw new BadRequestException(
        'Delivery already has a rider. Unassign first.',
      );
    }

    // Guard: prevent assignment to terminal deliveries
    if (
      TERMINAL_DELIVERY_STATUSES.includes(delivery.status as DeliveryStatus)
    ) {
      throw new BadRequestException(
        `Cannot assign a rider to a ${delivery.status} delivery.`,
      );
    }

    this.logger.debug(`Assigning rider ${riderId} to delivery ${deliveryId}`);

    const updated = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        riderId,
        status: DeliveryStatus.ASSIGNED,
        assignedAt: new Date(),
      },
      include: {
        rider: { select: { id: true, name: true, phone: true } },
        customer: { select: { name: true, phone: true } },
        pickupAddress: true,
        dropoffAddress: true,
        order: { include: { store: { include: { vendor: true } } } },
      },
    });

    this.logger.debug(JSON.stringify(updated, null, 2));

    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'RIDER_MANUALLY_ASSIGNED',
        target: deliveryId,
        metadata: { riderId, riderName: rider.name },
      },
    });

    try {
      this.logger.debug(`Emitting job.assigned socket to rider ${riderId}`);
      this.notificationsGateway.emitJobAssigned(riderId, {
        id: updated.id,
        jobType: 'delivery',
        customerName:
          (updated as any).order?.store?.name ||
          updated.customer?.name ||
          'Store',
        pickupAddress: updated.pickupAddress,
        dropoffAddress: updated.dropoffAddress,
        earnings: updated.deliveryFee,
        estimatedEarnings: updated.deliveryFee,
        distanceKm: updated.distanceKm ?? 0,
        packageDetails: updated.packageDetails ?? undefined,
        pickupContactPhone:
          updated.pickupAddress?.phone ||
          (updated as any).order?.store?.vendor?.phone ||
          updated.customer?.phone ||
          null,
        dropoffContactPhone: (updated as any).recipientPhone || null,
        recipientName: (updated as any).recipientName || null,
        requiresOtp: !!(updated as any).deliveryOtp,
        assignedByAdmin: true,
      });
    } catch (e) {
      this.logger.error(`Failed to emit job.assigned to rider ${riderId}`, e);
    }

    // Notify customer (push + in-app) — no dedicated socket event on delivery side
    if (updated.customerId) {
      try {
        const storeName =
          (updated as any).order?.store?.name ||
          updated.customer?.name ||
          'the store';
        await this.notificationsService.create({
          userId: updated.customerId,
          title: 'Rider On The Way',
          message: `A rider has been assigned to pick up your order from ${storeName}.`,
          type: 'DELIVERY',
          metadata: { deliveryId: updated.id, type: 'RIDER_ASSIGNED' },
        });
      } catch (e) {
        this.logger.error(
          `Failed to notify customer ${updated.customerId} for delivery ${deliveryId}`,
          e,
        );
      }
    }

    return updated;
  }

  async assignRiderToGroup(
    orderGroupId: string,
    riderId: string,
    adminId: string,
  ) {
    this.logger.debug(
      `assignRiderToGroup - group: ${orderGroupId}, rider: ${riderId}`,
    );

    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });
    if (!rider) throw new NotFoundException('Rider not found');
    if (rider.status !== 'ACTIVE')
      throw new BadRequestException('Rider is not active');

    const groupDeliveries = await this.prisma.delivery.findMany({
      where: { orderGroupId } as any,
      include: {
        order: {
          include: {
            store: { include: { vendor: true } },
            items: { include: { product: true } },
          },
        },
        customer: { select: { name: true, phone: true } },
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (groupDeliveries.length === 0) {
      this.logger.warn(`No deliveries found in group ${orderGroupId}`);
      throw new NotFoundException(
        `No deliveries found for group ${orderGroupId}`,
      );
    }

    this.logger.debug(
      `Assigning rider ${riderId} to ${groupDeliveries.length} deliveries in group ${orderGroupId}`,
    );

    const stops = groupDeliveries.map((d) => ({
      orderId: d.orderId,
      storeName: d.order?.store?.name || 'Store',
      pickupAddressId: d.pickupAddressId,
      pickupAddress: d.pickupAddress,
      status: 'PENDING',
    }));

    const leadDelivery = groupDeliveries[0];
    const dropoffAddress = leadDelivery.dropoffAddress;

    await this.prisma.$transaction(
      groupDeliveries.map((d) =>
        this.prisma.delivery.update({
          where: { id: d.id },
          data: {
            riderId,
            status: DeliveryStatus.ASSIGNED,
            assignedAt: new Date(),
            ...(d.id === leadDelivery.id ? { stops, currentStopIndex: 0 } : {}),
          } as any,
        }),
      ),
    );

    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'RIDER_ASSIGNED_TO_GROUP',
        target: orderGroupId,
        metadata: {
          riderId,
          riderName: rider.name,
          deliveryCount: groupDeliveries.length,
        },
      },
    });

    try {
      this.logger.debug(
        `Emitting multi-stop job assignment to rider ${riderId}`,
      );
      this.notificationsGateway.emitJobAssigned(riderId, {
        id: leadDelivery.id,
        jobType: 'delivery',
        customerName: `${groupDeliveries.length} Stores`,
        pickupAddress: leadDelivery.pickupAddress,
        dropoffAddress,
        earnings: groupDeliveries.reduce((s, d) => s + (d.deliveryFee || 0), 0),
        estimatedEarnings: groupDeliveries.reduce(
          (s, d) => s + (d.deliveryFee || 0),
          0,
        ),
        pickupContactPhone:
          leadDelivery.pickupAddress?.phone ||
          (leadDelivery as any).order?.store?.vendor?.phone ||
          null,
        dropoffContactPhone: (leadDelivery as any).recipientPhone || null,
        recipientName: (leadDelivery as any).recipientName || null,
        stops,
        storeCount: stops.length,
        currentStopIndex: 0,
        orderGroupId,
        requiresOtp: !!(leadDelivery as any).deliveryOtp,
        assignedByAdmin: true,
      });
    } catch (e) {
      this.logger.error(
        `Failed to emit group job.assigned to rider ${riderId}`,
        e,
      );
    }

    return {
      success: true,
      deliveryCount: groupDeliveries.length,
      leadDeliveryId: leadDelivery.id,
    };
  }

  async remove(id: string, adminUserId?: string, reason?: string) {
    this.logger.debug(
      `remove (cancel) delivery ${id} - reason: ${reason || 'none'}`,
    );

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

    if (!delivery) {
      this.logger.warn(`remove - delivery not found: ${id}`);
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.status === 'DELIVERED') {
      this.logger.warn(`Cannot cancel completed delivery: ${id}`);
      throw new BadRequestException('Cannot delete a completed delivery');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      if (delivery.orderId && delivery.order) {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        });

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

      this.logger.debug(`Delivery ${id} cancelled successfully`);
    });
  }

  async refundDelivery(id: string, refundAmount?: number, reason?: string) {
    this.logger.debug(
      `refundDelivery - id: ${id}, amount: ${refundAmount || 'full'}`,
    );

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

    if (!delivery.order) {
      throw new BadRequestException(
        'No associated order found for this delivery',
      );
    }

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
      const payment = delivery.order!.payment!;

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status:
            amountToRefund === payment.amount
              ? 'REFUNDED'
              : 'PARTIALLY_REFUNDED',
        },
      });

      await this.ledgerService.recordRefund({
        id: payment.id,
        amount: amountToRefund,
        userId: delivery.order!.user.id,
        ...(delivery.orderId && { orderId: delivery.orderId }),
      });

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

      this.logger.debug(
        `Refund processed for delivery ${id} - amount: ${amountToRefund}`,
      );
    });
  }

  // Transformation helpers remain unchanged — usually no logging needed here
  // You can add .debug() if you want visibility into data shape issues

  private inferType(weight: number, isFragile: boolean): string {
    if (weight > 50) return 'Freight';
    if (isFragile) return 'Fragile Parcel';
    if (weight < 1) return 'Document';
    return 'Parcel';
  }

  private formatAddress = (addr: any): string => {
    if (!addr) return 'N/A';
    const parts = [addr.street, addr.city, addr.state].filter(
      (p) => p && p.trim() && p.trim().toLowerCase() !== 'unknown',
    );
    return parts.length > 0 ? parts.join(', ') : addr.label || 'N/A';
  };

  private transformForList = (d: any) => {
    const orderItems: string[] = (d.order?.items ?? []).map(
      (i: any) => i.product?.name || 'Item',
    );
    return {
      id: d.id,
      orderGroupId: (d as any).orderGroupId ?? null,
      type: this.inferType(d.weightKg || 0, d.isFragile),
      sender: d.order?.store?.name || d.customer?.name || '—',
      recipient: d.recipientName || '—',
      driver: d.rider?.name || '-',
      riderId: d.rider?.id ?? null,
      status:
        d.status === 'PICKED_UP'
          ? 'In Transit'
          : d.status === 'ASSIGNED'
            ? 'Pending Pickup'
            : d.status === 'REQUESTED'
              ? 'Pending Pickup'
              : d.status.charAt(0) + d.status.slice(1).toLowerCase(),
      pickup: this.formatAddress(d.pickupAddress),
      dropoff: this.formatAddress(d.dropoffAddress),
      eta: d.deliveredAt ? 'Delivered' : 'Est. 2 hrs',
      // Package flags shown to admin & rider
      isFragile: d.isFragile ?? false,
      isPerishable: d.isPerishable ?? false,
      containsLiquid: d.containsLiquid ?? false,
      weightKg: d.weightKg ?? null,
      packageDetails: d.packageDetails ?? null,
      orderItems,
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
            phone: d.order.store.vendor?.phone || 'N/A',
          }
        : {
            name: d.customer.name,
            address: d.pickupAddress
              ? this.formatAddress(d.pickupAddress)
              : 'N/A',
            phone: d.customer.phone,
          },

      recipient: {
        name: d.recipientName,
        address: d.dropoffAddress
          ? this.formatAddress(d.dropoffAddress)
          : 'N/A',
        phone: d.recipientPhone,
        instructions: 'N/A',
      },

      // ✅ FIX: Access rider fields directly
      courier: d.rider
        ? {
            name: d.rider.name,
            id: d.rider.id,
            vehicle: d.rider.vehicle
              ? `${d.rider.vehicle.color} ${d.rider.vehicle.model}`.trim()
              : 'Not registered',
            phone: d.rider.phone,
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
          loc: d.pickupAddress ? this.formatAddress(d.pickupAddress) : 'Pickup',
          time: d.pickedUpAt,
          done: !!d.pickedUpAt,
        },
        {
          status: 'Delivered',
          loc: d.dropoffAddress
            ? this.formatAddress(d.dropoffAddress)
            : 'Dropoff',
          time: d.deliveredAt,
          done: !!d.deliveredAt,
        },
      ],
    };
  };
}
