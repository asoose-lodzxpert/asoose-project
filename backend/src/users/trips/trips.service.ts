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
  RideStatus,
  DeliveryStatus,
  Prisma,
  TransactionType,
  TransactionStatus,
  WalletEntityType,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GeoService } from '../../matching/geo/geo.service';
import { EventBusService } from '../../matching/events/event-bus.service';
import { QueueService } from '../../matching/queue/queue.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import { RedisService } from '../../matching/redis/redis.service';
import {
  RequestRideDto,
  RequestDeliveryDto,
  CancelTripDto,
} from './dto/trip.dto';

const CONFIG = {
  OTP_LENGTH: 6,
  OTP_TTL_MS: 15 * 60 * 1000,
  MAX_OTP_ATTEMPTS: 3,
  MAX_DELIVERY_WEIGHT_KG: 100,
  MIN_DELIVERY_WEIGHT_KG: 0.1,
  COMPLETION_RADIUS_KM: 0.5,
  PAGINATION_MAX_LIMIT: 50,
  PAGINATION_DEFAULT_LIMIT: 20,
  PHONE_MASK_VISIBLE_DIGITS: 4,
  MAX_TEXT_LENGTH: 500,
};

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly eventBus: EventBusService,
    private readonly queue: QueueService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly redis: RedisService,
  ) {}

  // ========================================
  // SHARED UTILITIES
  // ========================================

  /**
   * Safe Rounding Utility to prevent Float errors
   * e.g. rounds 10.99999999 to 11.00
   */
  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private maskPhoneNumber(phone: string): string {
    if (!phone || phone.length < 8) return '***';
    const visible = phone.slice(-CONFIG.PHONE_MASK_VISIBLE_DIGITS);
    return `***${visible}`;
  }

  private sanitizeText(text?: string): string {
    return text ? text.trim().slice(0, CONFIG.MAX_TEXT_LENGTH) : '';
  }

  private validatePagination(page: number, limit: number) {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(
      Math.max(1, limit || CONFIG.PAGINATION_DEFAULT_LIMIT),
      CONFIG.PAGINATION_MAX_LIMIT,
    );
    return { page: safePage, limit: safeLimit };
  }

  private async checkOtpRateLimit(
    entityId: string,
    action: string,
  ): Promise<void> {
    const key = `otp_attempts:${action}:${entityId}`;
    const client = this.redis.getClient();
    const attempts = await client.incr(key);

    if (attempts === 1) {
      await client.expire(key, 60 * 15);
    }
    if (attempts > CONFIG.MAX_OTP_ATTEMPTS) {
      throw new ForbiddenException(
        'Too many failed OTP attempts. Please try again later.',
      );
    }
  }

  private async logActivity(
    userId: string,
    action: string,
    metadata: Record<string, any>,
  ) {
    try {
      const safeMetadata = JSON.parse(
        JSON.stringify(metadata, (key, value) => {
          if (['phone', 'email', 'password', 'token'].includes(key))
            return '***';
          return value;
        }),
      );

      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          details: JSON.stringify(safeMetadata),
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for ${action}`, error);
    }
  }

  // ========================================
  // RIDE REQUESTS
  // ========================================

  async requestRide(userId: string, dto: RequestRideDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const activeRide = await tx.ride.findFirst({
          where: {
            customerId: userId,
            status: {
              in: [
                RideStatus.PENDING,
                RideStatus.REQUESTED,
                RideStatus.ACCEPTED,
                RideStatus.IN_PROGRESS,
              ],
            },
          },
        });

        if (activeRide) {
          throw new ConflictException('You already have an active ride request');
        }

        const [pickupAddress, dropoffAddress] = await Promise.all([
          tx.address.findUnique({ where: { id: dto.pickupAddressId } }),
          tx.address.findUnique({ where: { id: dto.dropoffAddressId } }),
        ]);

        // Fix: Cast to any to handle stale Prisma types for isPublic
        if (
          !pickupAddress ||
          (pickupAddress.userId !== userId && !(pickupAddress as any).isPublic)
        ) {
          throw new BadRequestException('Invalid pickup address');
        }
        if (
          !dropoffAddress ||
          (dropoffAddress.userId !== userId && !(dropoffAddress as any).isPublic)
        ) {
          throw new BadRequestException('Invalid dropoff address');
        }

        if (
          !this.geo.validateCoordinates(pickupAddress.lat, pickupAddress.lng) ||
          !this.geo.validateCoordinates(dropoffAddress.lat, dropoffAddress.lng)
        ) {
          throw new BadRequestException('Invalid coordinates');
        }

        const distanceKm = this.geo.calculateDistance(
          pickupAddress.lat,
          pickupAddress.lng,
          dropoffAddress.lat,
          dropoffAddress.lng,
        );

        const durationMin = this.geo.estimateDuration(distanceKm);
        const fareDetails = this.geo.calculateFare(distanceKm, durationMin);
        const startOtp = this.geo.generateOTP(CONFIG.OTP_LENGTH);

        const ride = await tx.ride.create({
          data: {
            customerId: userId,
            pickupAddressId: dto.pickupAddressId,
            dropoffAddressId: dto.dropoffAddressId,
            status: RideStatus.PENDING,
            distanceKm,
            durationMin,
            baseFare: this.round(fareDetails.baseFare),
            distanceFare: this.round(fareDetails.distanceFare),
            timeFare: this.round(fareDetails.timeFare),
            platformFee: this.round(fareDetails.platformFee),
            driverFee: this.round(fareDetails.driverFee),
            totalFare: this.round(fareDetails.totalFare),
            startOtp,
            surgeMultiplier: 1.0,
          },
          include: { pickupAddress: true, dropoffAddress: true },
        });

        return {
          ride,
          fareBreakdown: fareDetails,
          message: 'Ride created. Complete payment to request a driver.',
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async startRideMatching(rideId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { rideId },
    });

    if (
      payment &&
      payment.status !== PaymentStatus.COMPLETED &&
      payment.status !== PaymentStatus.PENDING
    ) {
      this.logger.warn(`Payment not ready for ride ${rideId}`);
    }

    const result = await this.prisma.ride.updateMany({
      where: {
        id: rideId,
        status: RideStatus.PENDING,
      },
      data: { status: RideStatus.REQUESTED },
    });

    if (result.count === 0) {
      this.logger.warn(`Idempotency: Ride ${rideId} match request skipped.`);
      return;
    }

    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { pickupAddress: true, dropoffAddress: true, customer: true },
    });

    // Fix: Strict null check to resolve TS18047
    if (!ride) {
      throw new NotFoundException('Ride not found after status update');
    }

    try {
      this.notificationsGateway.server
        .to(`user_${ride.customerId}`)
        .emit('ride_update', {
          rideId: ride.id,
          status: 'DRIVER_SEARCHING',
          label: 'Finding a Driver',
        });
    } catch (e) {
      this.logger.error(`Notification failed for ride ${rideId}`, e);
    }

    const eventPayload = {
      rideId: ride.id,
      customerId: ride.customerId,
      pickupLat: ride.pickupAddress.lat,
      pickupLng: ride.pickupAddress.lng,
      dropoffLat: ride.dropoffAddress.lat,
      dropoffLng: ride.dropoffAddress.lng,
      distanceKm: ride.distanceKm || 0,
      totalFare: Number(ride.totalFare) || 0,
      timestamp: Date.now(),
      expiresAt: Date.now() + CONFIG.OTP_TTL_MS,
    };

    this.eventBus.emitRideRequested(eventPayload);
    await this.queue.enqueueRideMatching({
      ...eventPayload,
      attempt: 1,
    });
  }

  async acceptRide(rideId: string, riderId: string) {
    if (!riderId) throw new ForbiddenException('Rider identity missing');

    const result = await this.prisma.ride.updateMany({
      where: {
        id: rideId,
        status: RideStatus.REQUESTED,
      },
      data: {
        status: RideStatus.ACCEPTED,
        riderId: riderId,
        acceptedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Ride already accepted or unavailable');
    }

    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { rider: { include: { vehicle: true } } },
    });

    if (!ride?.rider) throw new InternalServerErrorException('Rider link failed');

    try {
      this.notificationsGateway.server
        .to(`user_${ride.customerId}`)
        .emit('ride_update', {
          rideId: ride.id,
          status: 'ACCEPTED',
          label: 'Driver Assigned',
          description: `${ride.rider.name} is on the way`,
          rider: {
            name: ride.rider.name,
            phone: this.maskPhoneNumber(ride.rider.phone),
            vehicle: ride.rider.vehicle
              ? `${ride.rider.vehicle.color} ${ride.rider.vehicle.model}`
              : 'Vehicle',
          },
        });
    } catch (e) {
      this.logger.error('Socket error', e);
    }

    await this.logActivity(riderId, 'RIDE_ACCEPTED', { rideId });
    return ride;
  }

  async startRide(rideId: string, riderId: string, otp: string) {
    await this.checkOtpRateLimit(rideId, 'start_ride');

    const result = await this.prisma.ride.updateMany({
      where: {
        id: rideId,
        riderId: riderId,
        startOtp: otp,
        status: RideStatus.ACCEPTED,
      },
      data: {
        status: RideStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('Invalid OTP or Ride not available');
    }

    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });

    // Fix: Optional chain or check if ride exists, though updateMany passed.
    if (ride) {
      this.notificationsGateway.server
        .to(`user_${ride.customerId}`)
        .emit('ride_update', {
          rideId: ride.id,
          status: 'IN_PROGRESS',
          label: 'Trip Started',
        });
    }

    await this.logActivity(riderId, 'RIDE_STARTED', { rideId });
    return { success: true };
  }

  async completeRide(
    rideId: string,
    riderId: string,
    lat: number,
    lng: number,
  ) {
    if (!this.geo.validateCoordinates(lat, lng))
      throw new BadRequestException('Invalid coordinates');

    return this.prisma.$transaction(async (tx) => {
      const ride = await tx.ride.findUnique({
        where: { id: rideId },
        include: { dropoffAddress: true },
      });

      if (!ride) throw new NotFoundException('Ride not found');
      if (ride.riderId !== riderId) throw new ForbiddenException('Unauthorized');
      if (ride.status !== RideStatus.IN_PROGRESS)
        throw new BadRequestException('Ride not in progress');

      const dist = this.geo.calculateDistance(
        lat,
        lng,
        ride.dropoffAddress.lat,
        ride.dropoffAddress.lng,
      );
      if (dist > CONFIG.COMPLETION_RADIUS_KM) {
        throw new BadRequestException(
          `Too far from destination (${dist.toFixed(2)}km)`,
        );
      }

      await tx.ride.update({
        where: { id: rideId },
        data: {
          status: RideStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      const rider = await tx.rider.findUnique({ where: { id: riderId } });
      if (!rider)
        throw new InternalServerErrorException('Rider profile missing');

      const earning = Number(ride.driverFee) || 0;
      const balanceBefore = Number(rider.walletBalance);
      const balanceAfter = this.round(balanceBefore + earning);

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
          rideId: ride.id,
          status: TransactionStatus.COMPLETED,
          description: `Earnings for ride ${ride.id}`,
        },
      });

      return { message: 'Ride completed' };
    });
  }

  async cancelRide(userId: string, rideId: string, dto: CancelTripDto) {
    const reason = this.sanitizeText(dto.reason);

    const result = await this.prisma.ride.updateMany({
      where: {
        id: rideId,
        customerId: userId,
        status: {
          notIn: [
            RideStatus.COMPLETED,
            RideStatus.CANCELLED,
            RideStatus.IN_PROGRESS,
          ],
        },
      },
      data: {
        status: RideStatus.CANCELLED,
        cancelledBy: 'CUSTOMER',
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new BadRequestException('Cannot cancel ride in current status');
    }

    await this.logActivity(userId, 'RIDE_CANCELLED', { rideId, reason });
    return { message: 'Ride cancelled' };
  }

  async requestDelivery(userId: string, dto: RequestDeliveryDto) {
    if (
      dto.weightKg &&
      (dto.weightKg < CONFIG.MIN_DELIVERY_WEIGHT_KG ||
        dto.weightKg > CONFIG.MAX_DELIVERY_WEIGHT_KG)
    ) {
      throw new BadRequestException('Invalid weight');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate Order Link (if provided)
      if (dto.orderId) {
        const order = await tx.order.findUnique({
          where: { id: dto.orderId },
        });
        if (!order || order.userId !== userId)
          throw new ForbiddenException('Invalid order link');
      }

      // 2. Fetch Addresses
      const [pickupAddress, dropoffAddress] = await Promise.all([
        tx.address.findUnique({ where: { id: dto.pickupAddressId } }),
        tx.address.findUnique({ where: { id: dto.dropoffAddressId } }),
      ]);

      // 3. Validate Address Ownership
      if (!pickupAddress || pickupAddress.userId !== userId) {
        throw new BadRequestException('Invalid pickup address');
      }
      if (!dropoffAddress || dropoffAddress.userId !== userId) {
        throw new BadRequestException('Invalid dropoff address');
      }

      // 4. Calculate Logistics (Distance & Fee)
      if (
        !this.geo.validateCoordinates(pickupAddress.lat, pickupAddress.lng) ||
        !this.geo.validateCoordinates(dropoffAddress.lat, dropoffAddress.lng)
      ) {
        throw new BadRequestException('Invalid coordinates');
      }

      const distanceKm = this.geo.calculateDistance(
        pickupAddress.lat,
        pickupAddress.lng,
        dropoffAddress.lat,
        dropoffAddress.lng,
      );

      const deliveryFee = this.geo.calculateDeliveryFee(
        distanceKm,
        dto.weightKg || 1
      );

      // 5. Create Delivery Record
      const deliveryOtp = this.geo.generateOTP(CONFIG.OTP_LENGTH);
      
      const delivery = await tx.delivery.create({
        data: {
          customerId: userId,
          orderId: dto.orderId,
          pickupAddressId: dto.pickupAddressId,
          dropoffAddressId: dto.dropoffAddressId,
          status: DeliveryStatus.PENDING,
          deliveryFee: this.round(deliveryFee), 
          distanceKm: this.round(distanceKm),
          recipientName: this.sanitizeText(dto.recipientName),
          recipientPhone: dto.recipientPhone,
          packageDetails: this.sanitizeText(dto.packageDetails),
          weightKg: dto.weightKg,
          deliveryOtp,
        },
      });

      return {
        delivery,
        deliveryFee: delivery.deliveryFee,
        distance: delivery.distanceKm,
        message: 'Delivery request created',
      };
    });
  }

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
      },
    });

    // Fix: Strict null check to resolve TS18047
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

    const eventPayload = {
      deliveryId: delivery.id,
      customerId: delivery.customerId,
      orderId: delivery.orderId || undefined,
      pickupLat: delivery.pickupAddress.lat,
      pickupLng: delivery.pickupAddress.lng,
      dropoffLat: delivery.dropoffAddress.lat,
      dropoffLng: delivery.dropoffAddress.lng,
      distanceKm: delivery.distanceKm || 0,
      deliveryFee: Number(delivery.deliveryFee),
      packageDetails: delivery.packageDetails || undefined,
      recipientName: delivery.recipientName,
      recipientPhone: delivery.recipientPhone,
      timestamp: Date.now(),
    };

    this.eventBus.emitDeliveryRequested(eventPayload);
    await this.queue.enqueueDeliveryMatching({
      ...eventPayload,
      attempt: 1,
    });

    return {
      message: 'Delivery matching started',
      status: DeliveryStatus.REQUESTED,
    };
  }

  async assignDriver(deliveryId: string, riderId: string) {
    if (!riderId) throw new ForbiddenException();

    const result = await this.prisma.delivery.updateMany({
      where: { id: deliveryId, status: DeliveryStatus.REQUESTED },
      data: { status: DeliveryStatus.ASSIGNED, riderId, assignedAt: new Date() },
    });

    if (result.count === 0) throw new ConflictException('Delivery unavailable');
    return { success: true };
  }

  async confirmPickup(deliveryId: string, riderId: string, proof: string) {
    if (!riderId) throw new ForbiddenException();
    if (!proof || proof.length > 2048)
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
        pickupProof: proof,
      },
    });

    if (result.count === 0)
      throw new BadRequestException('Invalid state for pickup');
    return { success: true };
  }

  async completeDelivery(
    deliveryId: string,
    riderId: string,
    otp: string,
    proof: string,
    lat: number,
    lng: number,
  ) {
    if (!riderId) throw new ForbiddenException();
    if (!this.geo.validateCoordinates(lat, lng))
      throw new BadRequestException('Invalid coords');

    await this.checkOtpRateLimit(deliveryId, 'complete_delivery');

    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({
        where: { id: deliveryId },
        include: { dropoffAddress: true },
      });

      if (!delivery || delivery.riderId !== riderId)
        throw new ForbiddenException();
      if (delivery.status !== DeliveryStatus.PICKED_UP)
        throw new BadRequestException('Invalid state');
      if (delivery.deliveryOtp !== otp)
        throw new BadRequestException('Invalid OTP');

      const dist = this.geo.calculateDistance(
        lat,
        lng,
        delivery.dropoffAddress.lat,
        delivery.dropoffAddress.lng,
      );
      if (dist > CONFIG.COMPLETION_RADIUS_KM)
        throw new BadRequestException('Too far from dropoff');

      await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          status: DeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
          deliveryProof: proof,
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
      const earning = this.round(fee * 0.8);
      const balanceBefore = Number(rider.walletBalance);
      const balanceAfter = this.round(balanceBefore + earning);

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

      return { success: true };
    });
  }

  async cancelDelivery(userId: string, deliveryId: string, dto: CancelTripDto) {
    const reason = this.sanitizeText(dto.reason);
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

    await this.logActivity(userId, 'DELIVERY_CANCELLED', {
      deliveryId,
      reason,
    });
    return { message: 'Delivery cancelled' };
  }

  // ========================================
  // FETCHING (DATA ACCESS)
  // ========================================

  async getUserRides(userId: string, status?: string, page = 1, limit = 20) {
    const { page: safePage, limit: safeLimit } = this.validatePagination(
      page,
      limit,
    );
    const skip = (safePage - 1) * safeLimit;

    const allowedStatuses = Object.values(RideStatus) as string[];
    const statusFilter =
      status && allowedStatuses.includes(status) ? status : undefined;

    return this.prisma.ride.findMany({
      where: {
        customerId: userId,
        ...(statusFilter && { status: statusFilter as RideStatus }),
      },
      take: safeLimit,
      skip,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        totalFare: true,
        createdAt: true,
        pickupAddress: { select: { street: true } },
        dropoffAddress: { select: { street: true } },
      },
    });
  }

  async getRideById(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        rider: {
          include: { vehicle: true },
        },
        payment: true,
      },
    });

    if (!ride || ride.customerId !== userId) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.rider) {
      ride.rider.phone = this.maskPhoneNumber(ride.rider.phone);
    }

    return ride;
  }

  async getUserDeliveries(
    userId: string,
    status?: string,
    page = 1,
    limit = 20,
  ) {
    const { page: safePage, limit: safeLimit } = this.validatePagination(
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
      },
    });

    if (!delivery || delivery.customerId !== userId) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.rider) {
      delivery.rider.phone = this.maskPhoneNumber(delivery.rider.phone);
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
        status: DeliveryStatus.ASSIGNED,
        riderId: riderId,
        assignedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new ConflictException('Delivery already accepted or unavailable');
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: { rider: { include: { vehicle: true } } },
    });

    if (!delivery?.rider) throw new InternalServerErrorException('Rider link failed');

    try {
      this.notificationsGateway.server
        .to(`user_${delivery.customerId}`)
        .emit('delivery_update', { // Make sure frontend listens for this event
          deliveryId: delivery.id,
          status: 'ASSIGNED', // UI expects 'COURIER_ASSIGNED' mapping
          label: 'Courier Assigned',
          rider: {
            name: delivery.rider.name,
            phone: this.maskPhoneNumber(delivery.rider.phone),
            vehicle: delivery.rider.vehicle
              ? `${delivery.rider.vehicle.color} ${delivery.rider.vehicle.model}`
              : 'Vehicle',
          },
        });
    } catch (e) {
      this.logger.error('Socket error', e);
    }

    await this.logActivity(riderId, 'DELIVERY_ACCEPTED', { deliveryId });
    return delivery;
  }
}