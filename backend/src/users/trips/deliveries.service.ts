import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  DeliveryStatus,
  PaymentStatus,
  TransactionStatus,
  TransactionType,
  WalletEntityType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GeoService } from '../../matching/geo/geo.service';
import { EventBusService } from '../../matching/events/event-bus.service';
import { QueueService } from '../../matching/queue/queue.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { RequestDeliveryDto, CancelTripDto } from './dto/trip.dto';
import { TripsCommonService, TRIPS_CONFIG } from './trips.common.service';
import { deliveryToJobSummary } from '../../riders/jobs/job.dto';
import { AddressesService } from '../addresses.service';
import { FareService } from '../../fare/fare.service';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly fareService: FareService,
    private readonly eventBus: EventBusService,
    private readonly queue: QueueService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly common: TripsCommonService,
    private readonly addressesService: AddressesService,
  ) {}

  // ==================================================================
  // JOBS SERVICE COMPATIBILITY METHODS
  // ==================================================================

  async findActiveDeliveryForRider(riderId: string) {
    return this.prisma.delivery.findFirst({
      where: {
        riderId,
        status: {
          in: [
            DeliveryStatus.ASSIGNED,
            DeliveryStatus.ACCEPTED,
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.IN_TRANSIT,
          ],
        },
      },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        customer: true,
        order: {
          include: {
            store: { include: { vendor: true } },
          },
        },
      },
    });
  }

  async findIncomingDeliveriesForRider(riderId: string) {
    return this.prisma.delivery.findMany({
      where: {
        status: DeliveryStatus.REQUESTED,
      },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        customer: true,
      },
      take: 10,
    });
  }

  async updateDeliveryStatus(deliveryId: string, status: string) {
    return this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: status as DeliveryStatus },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        customer: true,
      },
    });
  }

  async declineDelivery(deliveryId: string, riderId: string) {
    return { success: true };
  }

  async arrivePickup(deliveryId: string, riderId: string) {
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { pickupAddress: true, dropoffAddress: true, customer: true },
    });
  }

  async arriveDropoff(deliveryId: string, riderId: string) {
    return this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { pickupAddress: true, dropoffAddress: true, customer: true },
    });
  }

  // ==================================================================
  // DELIVERY REQUEST LOGIC
  // ==================================================================

  async requestDelivery(
    userId: string,
    dto: RequestDeliveryDto,
    idempotencyKey: string,
  ) {
    this.logger.debug(`[requestDelivery] userId=${userId}`);
    this.logger.debug(`[requestDelivery] DTO: ${JSON.stringify(dto, null, 2)}`);
    this.logger.debug(`[requestDelivery] idempotencyKey=${idempotencyKey}`);

    if (
      dto.weightKg &&
      (dto.weightKg < TRIPS_CONFIG.MIN_DELIVERY_WEIGHT_KG ||
        dto.weightKg > TRIPS_CONFIG.MAX_DELIVERY_WEIGHT_KG)
    ) {
      this.logger.warn(`[requestDelivery] Invalid weight: ${dto.weightKg}`);
      throw new BadRequestException('Invalid weight');
    }

    const t0 = Date.now();
    return this.prisma
      .$transaction(async (tx) => {
        this.logger.log(`[requestDelivery] Transaction started`);
        if (dto.orderId) {
          this.logger.log(`[requestDelivery] Checking orderId: ${dto.orderId}`);
          const order = await tx.order.findUnique({
            where: { id: dto.orderId },
          });
          if (!order || order.userId !== userId) {
            this.logger.warn(
              `[requestDelivery] Invalid order link for orderId=${dto.orderId}`,
            );
            throw new ForbiddenException('Invalid order link');
          }
        }

        let pickupAddress: any;
        let dropoffAddress: any;

        // Case A: Using Existing Address IDs
        if (dto.pickupAddressId && dto.dropoffAddressId) {
          this.logger.log(
            `[requestDelivery] Using existing address IDs: pickup=${dto.pickupAddressId}, dropoff=${dto.dropoffAddressId}`,
          );
          [pickupAddress, dropoffAddress] = await Promise.all([
            tx.address.findUnique({ where: { id: dto.pickupAddressId } }),
            tx.address.findUnique({ where: { id: dto.dropoffAddressId } }),
          ]);

          if (!pickupAddress || pickupAddress.userId !== userId) {
            this.logger.warn(
              `[requestDelivery] Invalid pickup address: ${dto.pickupAddressId}`,
            );
            throw new BadRequestException('Invalid pickup address');
          }
          if (!dropoffAddress || dropoffAddress.userId !== userId) {
            this.logger.warn(
              `[requestDelivery] Invalid dropoff address: ${dto.dropoffAddressId}`,
            );
            throw new BadRequestException('Invalid dropoff address');
          }
        }

        // Case B: Creating New Addresses from Client Payload (Place ID or GPS Fallback)
        // ✅ FIX: Strict Hybrid Architecture Trust Boundary Enforced
        else if (dto.pickupLocation && dto.dropoffLocation) {
          this.logger.log(
            `[requestDelivery] Resolving pickup/dropoff locations from payload`,
          );
          try {
            // 1. Backend resolves exact coordinates securely via Google Maps
            const t1 = Date.now();
            const securePickup = await this.common.resolveSecureLocation(
              dto.pickupLocation,
            );
            const secureDropoff = await this.common.resolveSecureLocation(
              dto.dropoffLocation,
            );
            this.logger.log(
              `[requestDelivery] Location resolution took ${Date.now() - t1}ms`,
            );

            // 2. Generate database records ONLY from the trusted, server-resolved data
            this.logger.log(
              `[requestDelivery] Creating pickup/dropoff addresses in DB`,
            );
            const t2 = Date.now();
            [pickupAddress, dropoffAddress] = await Promise.all([
              this.addressesService.createAddressFromData(
                userId,
                {
                  street: securePickup.address, // Trusted text directly from Maps API
                  lat: securePickup.lat, // Trusted coordinate
                  lng: securePickup.lng, // Trusted coordinate
                  label: 'Pickup Location',
                },
                tx,
              ),
              this.addressesService.createAddressFromData(
                userId,
                {
                  street: secureDropoff.address, // Trusted text directly from Maps API
                  lat: secureDropoff.lat, // Trusted coordinate
                  lng: secureDropoff.lng, // Trusted coordinate
                  label: 'Dropoff Location',
                },
                tx,
              ),
            ]);
            this.logger.log(
              `[requestDelivery] Address creation took ${Date.now() - t2}ms`,
            );
          } catch (error) {
            this.logger.error(
              `[requestDelivery] Error during location/address creation: ${error instanceof Error ? error.message : error}`,
            );
            // Will throw if geofence fails or coordinates are completely unroutable
            throw error;
          }
        } else {
          this.logger.warn(
            `[requestDelivery] Missing address IDs or location payload`,
          );
          throw new BadRequestException(
            'Either address IDs or location payload (Place ID) must be provided',
          );
        }

        // Calculate Distance & Fee securely from DB-verified addresses
        this.logger.log(`[requestDelivery] Calculating distance and fee`);
        const t3 = Date.now();
        const distanceKm = this.geo.calculateDistance(
          pickupAddress.lat,
          pickupAddress.lng,
          dropoffAddress.lat,
          dropoffAddress.lng,
        );

        // Use admin-configured rates (delivery_base_fare + delivery_per_km from systemSetting).
        const deliveryFee = await this.fareService.calcDeliveryFee(distanceKm);
        this.logger.log(
          `[requestDelivery] Distance: ${distanceKm} km, Fee: ${deliveryFee} (calc took ${Date.now() - t3}ms)`,
        );

        this.logger.log(`[requestDelivery] Creating delivery record in DB`);
        const t4 = Date.now();
        const delivery = await tx.delivery.create({
          data: {
            customerId: userId,
            orderId: dto.orderId,
            pickupAddressId: pickupAddress.id,
            dropoffAddressId: dropoffAddress.id,
            status: DeliveryStatus.PENDING,
            deliveryFee: this.common.round(deliveryFee),
            distanceKm: this.common.round(distanceKm),
            recipientName: this.common.sanitizeText(dto.recipientName),
            recipientPhone: dto.recipientPhone,
            senderName: dto.senderName
              ? this.common.sanitizeText(dto.senderName)
              : undefined,
            senderPhone: dto.senderPhone ?? undefined,
            packageDetails: this.common.sanitizeText(dto.packageDetails),

            weightKg: dto.weightKg,
            isFragile: dto.fragile ?? false,
            isPerishable: dto.perishable ?? false,
            containsLiquid: dto.containsLiquid ?? false,
            declaredValue: dto.declaredValue ?? 0,
          },
        });
        this.logger.log(
          `[requestDelivery] Delivery record created (took ${Date.now() - t4}ms)`,
        );

        this.logger.log(
          `[requestDelivery] SUCCESS (total ${Date.now() - t0}ms)`,
        );
        return {
          delivery,
          deliveryId: delivery.id,
          deliveryFee: delivery.deliveryFee,
          distance: delivery.distanceKm,
          message: 'Delivery request created',
        };
      })
      .then((result) => {
        // Broadcast to admin room after transaction commits
        this.notificationsGateway.sendToAdminRoom({
          id: result.deliveryId,
          type: 'DELIVERY',
          category: 'DELIVERY_CREATED',
          title: 'New Delivery Request',
          message: `Delivery from ${result.delivery.recipientName || 'Customer'} — ₦${result.delivery.deliveryFee} (${result.delivery.distanceKm} km)`,
          isRead: false,
          createdAt: new Date().toISOString(),
          metadata: { deliveryId: result.deliveryId },
        });
        return result;
      });
  }

  // ==================================================================
  // DELIVERY LIFECYCLE
  // ==================================================================

  async startDeliveryMatching(deliveryId: string) {
    const deliveryCheck = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!deliveryCheck) throw new NotFoundException('Delivery not found');

    if (deliveryCheck.orderId) {
      const payment = await this.prisma.payment.findUnique({
        where: { orderId: deliveryCheck.orderId },
      });

      if (
        payment &&
        payment.status !== PaymentStatus.COMPLETED &&
        payment.status !== PaymentStatus.PENDING
      ) {
        this.logger.warn(
          `Payment not ready for delivery ${deliveryId} (Order ${deliveryCheck.orderId})`,
        );
      }
    }

    const result = await this.prisma.delivery.updateMany({
      where: {
        id: deliveryId,
        status: DeliveryStatus.PENDING,
      },
      data: { status: DeliveryStatus.REQUESTED },
    });

    if (result.count === 0) {
      this.logger.warn(
        `Idempotency: Delivery ${deliveryId} match request skipped.`,
      );
      return;
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        customer: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found after status update');
    }

    if (delivery.orderId) {
      try {
        this.notificationsGateway.sendOrderUpdate(delivery.orderId, {
          status: 'DRIVER_SEARCHING',
          label: 'Finding a Rider',
          description: 'Searching for nearby riders...',
          eta: 'Calculating...',
        });
      } catch (e) {
        this.logger.error(`Notification failed for delivery ${deliveryId}`, e);
      }
    }

    const job = deliveryToJobSummary(delivery);
    const eventPayload = { job, attempt: 1 };
    this.eventBus.emitDeliveryRequested(eventPayload);
    await this.queue.enqueueDeliveryMatching(eventPayload);

    return {
      message: 'Delivery matching started',
      status: DeliveryStatus.REQUESTED,
    };
  }

  async assignDriver(deliveryId: string, riderId: string) {
    if (!riderId) throw new ForbiddenException();

    const result = await this.prisma.delivery.updateMany({
      where: { id: deliveryId, status: DeliveryStatus.REQUESTED },
      data: {
        status: DeliveryStatus.ASSIGNED,
        riderId,
        assignedAt: new Date(),
      },
    });

    if (result.count === 0) throw new ConflictException('Delivery unavailable');
    return { success: true };
  }

  async confirmPickup(deliveryId: string, riderId: string, proof?: string) {
    if (!riderId) throw new ForbiddenException();
    if (proof && proof.length > 2048)
      throw new BadRequestException('Invalid proof');

    const result = await this.prisma.delivery.updateMany({
      where: {
        id: deliveryId,
        riderId: riderId,
        status: DeliveryStatus.ASSIGNED,
      },
      data: {
        status: DeliveryStatus.PICKED_UP,
        pickedUpAt: new Date(),
      },
    });

    if (result.count === 0)
      throw new BadRequestException('Invalid state for pickup');

    // Emit socket event so customer sees real-time pickup status
    try {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id: deliveryId },
        select: { customerId: true },
      });
      if (delivery) {
        this.notificationsGateway.server
          .to(`user_${delivery.customerId}`)
          .emit('delivery_update', {
            deliveryId,
            status: 'PICKED_UP',
            label: 'Package Picked Up',
          });
      }
    } catch (e) {
      this.logger.error('Socket error confirmPickup', e);
    }

    return { success: true };
  }

  async completeDelivery(
    deliveryId: string,
    riderId: string,
    lat: number,
    lng: number,
  ) {
    if (!riderId) throw new ForbiddenException();
    if (!this.geo.validateCoordinates(lat, lng))
      throw new BadRequestException('Invalid coords');

    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({
        where: { id: deliveryId },
        include: { dropoffAddress: true },
      });

      if (!delivery || delivery.riderId !== riderId)
        throw new ForbiddenException();
      if (delivery.status !== DeliveryStatus.PICKED_UP)
        throw new BadRequestException('Invalid state');

      const dist = this.geo.calculateDistance(
        lat,
        lng,
        delivery.dropoffAddress.lat,
        delivery.dropoffAddress.lng,
      );
      if (dist > TRIPS_CONFIG.COMPLETION_RADIUS_KM)
        throw new BadRequestException('Too far from dropoff');

      await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: DeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      });

      if (delivery.orderId) {
        await tx.order.update({
          where: { id: delivery.orderId },
          data: { status: 'DELIVERED', deliveredAt: new Date() },
        });
      }

      const rider = await tx.rider.findUnique({ where: { id: riderId } });

      if (!rider)
        throw new InternalServerErrorException(
          'Rider profile missing during delivery completion',
        );

      const fee = Number(delivery.deliveryFee) || 0;
      const earning = this.common.round(fee * 0.8);
      const balanceBefore = Number(rider.walletBalance);
      const balanceAfter = this.common.round(balanceBefore + earning);

      await tx.rider.update({
        where: { id: riderId },
        data: { walletBalance: balanceAfter },
      });

      await tx.transaction.create({
        data: {
          type: TransactionType.RIDER_EARNING,
          amount: earning,
          balanceBefore: balanceBefore,
          balanceAfter: balanceAfter,
          entityId: riderId,
          entityType: WalletEntityType.RIDER,
          deliveryId: delivery.id,
          status: TransactionStatus.COMPLETED,
          description: `Earnings for delivery ${delivery.id}`,
        },
      });

      // Emit socket event so customer sees delivery completion in real-time
      try {
        this.notificationsGateway.server
          .to(`user_${delivery.customerId}`)
          .emit('delivery_update', {
            deliveryId,
            status: 'DELIVERED',
            label: 'Package Delivered',
          });
      } catch (e) {
        this.logger.error('Socket error completeDelivery', e);
      }

      return { success: true };
    });
  }

  async cancelDelivery(userId: string, deliveryId: string, dto: CancelTripDto) {
    const reason = this.common.sanitizeText(dto.reason);
    const result = await this.prisma.delivery.updateMany({
      where: {
        id: deliveryId,
        customerId: userId,
        status: {
          notIn: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED],
        },
      },
      data: {
        status: DeliveryStatus.CANCELLED,
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('Cannot cancel delivery');
    }

    await this.common.logActivity(userId, 'DELIVERY_CANCELLED', {
      deliveryId,
      reason,
    });
    return { message: 'Delivery cancelled' };
  }

  async getUserDeliveries(
    userId: string,
    status?: string,
    page = 1,
    limit = 20,
  ) {
    const { page: safePage, limit: safeLimit } = this.common.validatePagination(
      page,
      limit,
    );
    const skip = (safePage - 1) * safeLimit;

    const allowedStatuses = Object.values(DeliveryStatus) as string[];
    const statusFilter =
      status && allowedStatuses.includes(status) ? status : undefined;

    return this.prisma.delivery.findMany({
      where: {
        customerId: userId,
        ...(statusFilter && { status: statusFilter as DeliveryStatus }),
      },
      take: safeLimit,
      skip,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDeliveryById(userId: string, deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        rider: {
          include: { vehicle: true },
        },
        payment: {
          select: { status: true, method: true },
        },
      },
    });

    if (!delivery || delivery.customerId !== userId) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.rider) {
      delivery.rider.phone = this.common.maskPhoneNumber(delivery.rider.phone);
    }

    return delivery;
  }

  async acceptDelivery(deliveryId: string, riderId: string) {
    if (!riderId) throw new ForbiddenException('Rider identity missing');

    const result = await this.prisma.delivery.updateMany({
      where: {
        id: deliveryId,
        status: DeliveryStatus.REQUESTED,
      },
      data: {
        status: DeliveryStatus.ASSIGNED, // Or ACCEPTED
        riderId: riderId,
        assignedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Delivery already accepted or unavailable');
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        rider: { include: { vehicle: true } },
        customer: true,
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    if (!delivery?.rider)
      throw new InternalServerErrorException('Rider link failed');

    try {
      this.notificationsGateway.server
        .to(`user_${delivery.customerId}`)
        .emit('delivery_update', {
          deliveryId: delivery.id,
          status: 'ASSIGNED',
          label: 'Courier Assigned',
          rider: {
            name: delivery.rider.name,
            phone: this.common.maskPhoneNumber(delivery.rider.phone),
            vehicle: delivery.rider.vehicle
              ? `${delivery.rider.vehicle.color} ${delivery.rider.vehicle.model}`
              : 'Vehicle',
          },
        });
    } catch (e) {
      this.logger.error('Socket error', e);
    }

    await this.common.logActivity(riderId, 'DELIVERY_ACCEPTED', { deliveryId });
    return delivery;
  }
}
