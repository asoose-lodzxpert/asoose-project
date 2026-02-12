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

// src/users/trips/deliveries.service.ts

// ... imports

  async requestDelivery(
    userId: string,
    dto: RequestDeliveryDto,
    idempotencyKey?: string,
  ) {
    // 1. Validate Weight
    if (
      dto.weightKg &&
      (dto.weightKg < TRIPS_CONFIG.MIN_DELIVERY_WEIGHT_KG ||
        dto.weightKg > TRIPS_CONFIG.MAX_DELIVERY_WEIGHT_KG)
    ) {
      throw new BadRequestException('Invalid weight');
    }

    return this.prisma.$transaction(async (tx) => {
      // 2. Validate Order Link (if applicable)
      if (dto.orderId) {
        const order = await tx.order.findUnique({
          where: { id: dto.orderId },
        });
        if (!order || order.userId !== userId)
          throw new ForbiddenException('Invalid order link');
      }

      // 3. Helper to Resolve Address (Find or Create)
      const resolveAddress = async (
        addressId?: string,
        location?: { latitude: number; longitude: number; address: string },
        type: 'pickup' | 'dropoff' = 'pickup',
      ) => {
        // Case A: ID provided - Fetch existing
        if (addressId) {
          const address = await tx.address.findUnique({
            where: { id: addressId },
          });
          if (!address || address.userId !== userId) {
            throw new BadRequestException(`Invalid ${type} address ID`);
          }
          return address;
        }

        // Case B: Location provided - Create new address
        if (location) {
          // Note: Since LocationDto might lack city/state, we use defaults or parse address
          return await tx.address.create({
            data: {
              userId,
              label: `Delivery ${type} - ${new Date().toLocaleDateString()}`,
              street: location.address,
              city: 'Unknown', // You might want to use Geocoding service here to get city
              state: 'Unknown',
              lat: location.latitude,
              lng: location.longitude,
              isDefault: false,
            },
          });
        }

        // Case C: Neither provided
        throw new BadRequestException(
          `Please provide a ${type} address ID or location coordinates`,
        );
      };

      // 4. Resolve Both Addresses
      // This ensures we have valid Address objects (and thus valid IDs) before creating the delivery
      const [pickupAddress, dropoffAddress] = await Promise.all([
        resolveAddress(dto.pickupAddressId, dto.pickupLocation, 'pickup'),
        resolveAddress(dto.dropoffAddressId, dto.dropoffLocation, 'dropoff'),
      ]);

      // 5. Validate Coordinates (Double check)
      if (
        !this.geo.validateCoordinates(pickupAddress.lat, pickupAddress.lng) ||
        !this.geo.validateCoordinates(dropoffAddress.lat, dropoffAddress.lng)
      ) {
        throw new BadRequestException('Invalid coordinates detected');
      }

      // 6. Calculate Fee
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

      // 7. Create Delivery
      // ✅ FIX: We use pickupAddress.id (guaranteed string) instead of dto.pickupAddressId
      const delivery = await tx.delivery.create({
        data: {
          customerId: userId,
          orderId: dto.orderId,
          pickupAddressId: pickupAddress.id,   // ✅ Type safe: string
          dropoffAddressId: dropoffAddress.id, // ✅ Type safe: string
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
        deliveryFee: Number(delivery.deliveryFee),
        distance: Number(delivery.distanceKm),
        message: 'Delivery request created',
      };
    });
  }

async startDeliveryMatching(deliveryId: string) {
    const deliveryCheck = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!deliveryCheck) throw new NotFoundException('Delivery not found');

    // 1. Check Payment Status
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

    // 2. Update Status to REQUESTED (Idempotency check)
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

    // 3. Fetch Full Details (Include Customer for the DTO)
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        customer: true, // ✅ ADDED: Required for JobSummaryDto.customerName
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found after status update');
    }

    // 4. Send Order Update Notification (if linked to order)
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

    // 5. ✅ FIX: Use the Mapper to create the correct DTO
    // This converts the Prisma object into the JobSummaryDto structure
    const job = deliveryToJobSummary(delivery);

    // 6. Create the structured payload expected by the Queue
    const eventPayload = { 
      job,          // Contains the JobSummaryDto
      attempt: 1 
    };

    // 7. Emit events with the correct structure
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

    if (!delivery?.rider) throw new InternalServerErrorException('Rider link failed');

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