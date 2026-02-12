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
import { deliveryToJobSummary } from '../../jobs/job.dto';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly eventBus: EventBusService,
    private readonly queue: QueueService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly common: TripsCommonService,
  ) {}

  // --- JOBS SERVICE STUBS ---
  async findActiveDeliveryForRider(riderId: string): Promise<any> {
    // TODO: Implement actual logic
    return null;
  }

  async findIncomingDeliveriesForRider(riderId: string): Promise<any[]> {
    // TODO: Implement actual logic
    return [];
  }

  async updateDeliveryStatus(deliveryId: string, status: string): Promise<any> {
    // TODO: Implement actual logic
    return null;
  }

  async declineDelivery(deliveryId: string, riderId: string): Promise<any> {
    // TODO: Implement actual logic
    return { success: false };
  }

  async arrivePickup(deliveryId: string, riderId: string): Promise<any> {
    // TODO: Implement actual logic
    return { success: false };
  }

  async confirmPickup(deliveryId: string, riderId: string): Promise<any> {
    // TODO: Implement actual logic
    return { success: false };
  }

  async arriveDropoff(deliveryId: string, riderId: string): Promise<any> {
    // TODO: Implement actual logic
    return { success: false };
  }

  /**
   * Parse address string to extract city and state
   * Expected format: "Street, City, State" or "Street, City"
   */
  private parseAddress(fullAddress: string): {
    street: string;
    city: string;
    state: string;
  } {
    const parts = fullAddress.split(',').map((p) => p.trim());

    if (parts.length >= 3) {
      // Format: "Street, City, State"
      return {
        street: parts[0] || fullAddress,
        city: parts[1] || '',
        state: parts[2] || '',
      };
    } else if (parts.length === 2) {
      // Format: "Street, City"
      return {
        street: parts[0] || fullAddress,
        city: parts[1] || '',
        state: '',
      };
    } else {
      // Single string, treat as street
      return {
        street: fullAddress,
        city: '',
        state: '',
      };
    }
  }

  async requestDelivery(userId: string, dto: RequestDeliveryDto) {
    this.logger.debug(`Request delivery DTO: ${JSON.stringify(dto, null, 2)}`);

    if (
      dto.weightKg &&
      (dto.weightKg < TRIPS_CONFIG.MIN_DELIVERY_WEIGHT_KG ||
        dto.weightKg > TRIPS_CONFIG.MAX_DELIVERY_WEIGHT_KG)
    ) {
      throw new BadRequestException('Invalid weight');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.orderId) {
        const order = await tx.order.findUnique({
          where: { id: dto.orderId },
        });
        if (!order || order.userId !== userId)
          throw new ForbiddenException('Invalid order link');
      }

      let pickupAddress: any;
      let dropoffAddress: any;

      // If address IDs are provided, use them
      if (dto.pickupAddressId && dto.dropoffAddressId) {
        [pickupAddress, dropoffAddress] = await Promise.all([
          tx.address.findUnique({ where: { id: dto.pickupAddressId } }),
          tx.address.findUnique({ where: { id: dto.dropoffAddressId } }),
        ]);

        if (!pickupAddress || pickupAddress.userId !== userId) {
          throw new BadRequestException('Invalid pickup address');
        }
        if (!dropoffAddress || dropoffAddress.userId !== userId) {
          throw new BadRequestException('Invalid dropoff address');
        }
      }

      // Otherwise, create new addresses from location data
      else if (dto.pickupLocation && dto.dropoffLocation) {
        if (
          !this.geo.validateCoordinates(
            dto.pickupLocation.latitude,
            dto.pickupLocation.longitude,
          ) ||
          !this.geo.validateCoordinates(
            dto.dropoffLocation.latitude,
            dto.dropoffLocation.longitude,
          )
        ) {
          throw new BadRequestException('Invalid coordinates');
        }

        // Create addresses for the delivery
        const pickupParsed = this.parseAddress(dto.pickupLocation.address);
        const dropoffParsed = this.parseAddress(dto.dropoffLocation.address);

        [pickupAddress, dropoffAddress] = await Promise.all([
          tx.address.create({
            data: {
              userId,
              street: pickupParsed.street,
              city: pickupParsed.city,
              state: pickupParsed.state,
              lat: dto.pickupLocation.latitude,
              lng: dto.pickupLocation.longitude,
              label: 'Pickup Location',
            },
          }),
          tx.address.create({
            data: {
              userId,
              street: dropoffParsed.street,
              city: dropoffParsed.city,
              state: dropoffParsed.state,
              lat: dto.dropoffLocation.latitude,
              lng: dto.dropoffLocation.longitude,
              label: 'Dropoff Location',
            },
          }),
        ]);
      } else {
        throw new BadRequestException(
          'Either address IDs or location coordinates must be provided',
        );
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

      const deliveryFee = this.geo.calculateDeliveryFee(
        distanceKm,
        dto.weightKg || 1,
      );

      const deliveryOtp = this.geo.generateOTP(TRIPS_CONFIG.OTP_LENGTH);

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
          packageDetails: this.common.sanitizeText(dto.packageDetails),
          weightKg: dto.weightKg,
          deliveryOtp,
        },
      });

      return {
        delivery,
        deliveryId: delivery.id,
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

    // Prevent matching for direct delivery requests (no orderId)
    if (!deliveryCheck.orderId) {
      this.logger.warn(
        `Direct delivery request ${deliveryId} - matching skipped.`,
      );
      return {
        message: 'Direct delivery request - matching not started',
        status: deliveryCheck.status,
      };
    }

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

    if (!delivery) {
      throw new NotFoundException('Delivery not found after status update');
    }

    try {
      if (typeof delivery.orderId === 'string') {
        this.notificationsGateway.sendOrderUpdate(delivery.orderId, {
          status: 'DRIVER_SEARCHING',
          label: 'Finding a Rider',
          description: 'Searching for nearby riders...',
          eta: 'Calculating...',
        });
      }
    } catch (e) {
      this.logger.error(`Notification failed for delivery ${deliveryId}`, e);
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

    await this.common.checkOtpRateLimit(deliveryId, 'complete_delivery');

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
      if (dist > TRIPS_CONFIG.COMPLETION_RADIUS_KM)
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
