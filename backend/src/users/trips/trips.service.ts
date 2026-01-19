import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeoService } from '../../matching/geo/geo.service';
import { EventBusService } from '../../matching/events/event-bus.service';
import { QueueService } from '../../matching/queue/queue.service';
import {
  RequestRideDto,
  RequestDeliveryDto,
  CancelTripDto,
} from './dto/trip.dto';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly eventBus: EventBusService,
    private readonly queue: QueueService,
  ) {}

  // ========================================
  // RIDE REQUESTS
  // ========================================

  /**
   * Request a ride - creates ride with PENDING status
   * Actual matching starts after payment is successful
   */
  async requestRide(userId: string, dto: RequestRideDto) {
    // Get addresses
    const [pickupAddress, dropoffAddress] = await Promise.all([
      this.prisma.address.findUnique({
        where: { id: dto.pickupAddressId },
      }),
      this.prisma.address.findUnique({
        where: { id: dto.dropoffAddressId },
      }),
    ]);

    if (!pickupAddress || pickupAddress.userId !== userId) {
      throw new BadRequestException('Invalid pickup address');
    }

    if (!dropoffAddress || dropoffAddress.userId !== userId) {
      throw new BadRequestException('Invalid dropoff address');
    }

    // Validate coordinates
    if (!this.geo.validateCoordinates(pickupAddress.lat, pickupAddress.lng)) {
      throw new BadRequestException('Invalid pickup coordinates');
    }

    if (!this.geo.validateCoordinates(dropoffAddress.lat, dropoffAddress.lng)) {
      throw new BadRequestException('Invalid dropoff coordinates');
    }

    // Calculate distance and fare
    const distanceKm = this.geo.calculateDistance(
      pickupAddress.lat,
      pickupAddress.lng,
      dropoffAddress.lat,
      dropoffAddress.lng,
    );

    const durationMin = this.geo.estimateDuration(distanceKm);

    const fareDetails = this.geo.calculateFare(distanceKm, durationMin);

    // Generate OTP for ride start
    const startOtp = this.geo.generateOTP(4);

    // Create ride with PENDING status (awaiting payment)
    const ride = await this.prisma.ride.create({
      data: {
        customerId: userId,
        pickupAddressId: dto.pickupAddressId,
        dropoffAddressId: dto.dropoffAddressId,
        status: 'PENDING', // Will change to REQUESTED after payment
        distanceKm,
        durationMin,
        baseFare: fareDetails.baseFare,
        distanceFare: fareDetails.distanceFare,
        timeFare: fareDetails.timeFare,
        platformFee: fareDetails.platformFee,
        driverFee: fareDetails.driverFee,
        totalFare: fareDetails.totalFare,
        startOtp,
      },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    this.logger.log(
      `Ride ${ride.id} created with PENDING status for user ${userId}`,
    );

    return {
      ride,
      fareBreakdown: fareDetails,
      estimatedDuration: durationMin,
      distance: distanceKm,
      message: 'Ride created. Complete payment to request a driver.',
    };
  }

  /**
   * Start matching for a ride after payment is successful
   * Called by payment webhook
   */
  async startRideMatching(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        customer: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== 'PENDING') {
      this.logger.warn(
        `Cannot start matching for ride ${rideId}: status is ${ride.status}`,
      );
      return;
    }

    // Update status to REQUESTED
    await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: 'REQUESTED' },
    });

    this.logger.log(`Starting matching for ride ${rideId}`);

    // Emit event
    this.eventBus.emitRideRequested({
      rideId: ride.id,
      customerId: ride.customerId,
      pickupLat: ride.pickupAddress.lat,
      pickupLng: ride.pickupAddress.lng,
      dropoffLat: ride.dropoffAddress.lat,
      dropoffLng: ride.dropoffAddress.lng,
      distanceKm: ride.distanceKm || 0,
      totalFare: ride.totalFare || 0,
      timestamp: Date.now(),
    });

    // Enqueue matching job
    await this.queue.enqueueRideMatching({
      rideId: ride.id,
      customerId: ride.customerId,
      pickupLat: ride.pickupAddress.lat,
      pickupLng: ride.pickupAddress.lng,
      dropoffLat: ride.dropoffAddress.lat,
      dropoffLng: ride.dropoffAddress.lng,
      distanceKm: ride.distanceKm || 0,
      totalFare: ride.totalFare || 0,
      attempt: 1,
    });

    return {
      message: 'Ride matching started. Searching for nearby drivers...',
      rideId: ride.id,
      status: 'REQUESTED',
    };
  }

  /**
   * Get user's rides
   */
  async getUserRides(userId: string, status?: string) {
    const where: any = { customerId: userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.ride.findMany({
      where,
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            image: true,
            rating: true,
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get ride by ID
   */
  async getRideById(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            image: true,
            rating: true,
          },
        },
        payment: true,
      },
    });

    if (!ride || ride.customerId !== userId) {
      throw new NotFoundException('Ride not found');
    }

    return ride;
  }

  /**
   * Cancel ride
   */
  async cancelRide(userId: string, rideId: string, dto: CancelTripDto) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride || ride.customerId !== userId) {
      throw new NotFoundException('Ride not found');
    }

    if (['COMPLETED', 'CANCELLED'].includes(ride.status)) {
      throw new BadRequestException(
        `Cannot cancel ride with status: ${ride.status}`,
      );
    }

    await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'CANCELLED',
        cancelledBy: 'CUSTOMER',
        cancellationReason: dto.reason,
        cancelledAt: new Date(),
      },
    });

    // Emit cancellation event
    this.eventBus.emitRideCancelled({
      rideId,
      customerId: userId,
      driverId: ride.riderId || undefined,
      cancelledBy: 'customer',
      reason: dto.reason,
      cancelledAt: Date.now(),
    });

    this.logger.log(`Ride ${rideId} cancelled by customer ${userId}`);

    return { message: 'Ride cancelled successfully' };
  }

  // ========================================
  // DELIVERY REQUESTS
  // ========================================

  /**
   * Request a delivery - creates delivery with PENDING status
   * Actual matching starts after payment is successful
   */
  async requestDelivery(userId: string, dto: RequestDeliveryDto) {
    // Get addresses
    const [pickupAddress, dropoffAddress] = await Promise.all([
      this.prisma.address.findUnique({
        where: { id: dto.pickupAddressId },
      }),
      this.prisma.address.findUnique({
        where: { id: dto.dropoffAddressId },
      }),
    ]);

    if (!pickupAddress || pickupAddress.userId !== userId) {
      throw new BadRequestException('Invalid pickup address');
    }

    if (!dropoffAddress || dropoffAddress.userId !== userId) {
      throw new BadRequestException('Invalid dropoff address');
    }

    // Validate coordinates
    if (!this.geo.validateCoordinates(pickupAddress.lat, pickupAddress.lng)) {
      throw new BadRequestException('Invalid pickup coordinates');
    }

    if (!this.geo.validateCoordinates(dropoffAddress.lat, dropoffAddress.lng)) {
      throw new BadRequestException('Invalid dropoff coordinates');
    }

    // Calculate distance and fee
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

    // Generate OTP for delivery
    const deliveryOtp = this.geo.generateOTP(4);

    // Create delivery with PENDING status
    const delivery = await this.prisma.delivery.create({
      data: {
        customerId: userId,
        orderId: dto.orderId,
        pickupAddressId: dto.pickupAddressId,
        dropoffAddressId: dto.dropoffAddressId,
        status: 'PENDING', // Will change to REQUESTED after payment
        distanceKm,
        deliveryFee,
        packageDetails: dto.packageDetails,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        weightKg: dto.weightKg,
        deliveryOtp,
      },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
      },
    });

    this.logger.log(
      `Delivery ${delivery.id} created with PENDING status for user ${userId}`,
    );

    return {
      delivery,
      deliveryFee,
      distance: distanceKm,
      message: 'Delivery created. Complete payment to request a rider.',
    };
  }

  /**
   * Start matching for delivery after payment is successful
   * Called by payment webhook
   */
  async startDeliveryMatching(deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        customer: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.status !== 'PENDING') {
      this.logger.warn(
        `Cannot start matching for delivery ${deliveryId}: status is ${delivery.status}`,
      );
      return;
    }

    // Update status to REQUESTED
    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: 'REQUESTED' },
    });

    this.logger.log(`Starting matching for delivery ${deliveryId}`);

    // Emit event
    this.eventBus.emitDeliveryRequested({
      deliveryId: delivery.id,
      customerId: delivery.customerId,
      orderId: delivery.orderId || undefined,
      pickupLat: delivery.pickupAddress.lat,
      pickupLng: delivery.pickupAddress.lng,
      dropoffLat: delivery.dropoffAddress.lat,
      dropoffLng: delivery.dropoffAddress.lng,
      distanceKm: delivery.distanceKm || 0,
      deliveryFee: delivery.deliveryFee,
      packageDetails: delivery.packageDetails || undefined,
      recipientName: delivery.recipientName,
      recipientPhone: delivery.recipientPhone,
      timestamp: Date.now(),
    });

    // Enqueue matching job
    await this.queue.enqueueDeliveryMatching({
      deliveryId: delivery.id,
      customerId: delivery.customerId,
      orderId: delivery.orderId || undefined,
      pickupLat: delivery.pickupAddress.lat,
      pickupLng: delivery.pickupAddress.lng,
      dropoffLat: delivery.dropoffAddress.lat,
      dropoffLng: delivery.dropoffAddress.lng,
      distanceKm: delivery.distanceKm || 0,
      deliveryFee: delivery.deliveryFee,
      packageDetails: delivery.packageDetails || undefined,
      recipientName: delivery.recipientName,
      recipientPhone: delivery.recipientPhone,
      attempt: 1,
    });

    return {
      message: 'Delivery matching started. Searching for nearby riders...',
      deliveryId: delivery.id,
      status: 'REQUESTED',
    };
  }

  /**
   * Get user's deliveries
   */
  async getUserDeliveries(userId: string, status?: string) {
    const where: any = { customerId: userId };
    if (status) {
      where.status = status;
    }

    return this.prisma.delivery.findMany({
      where,
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        order: {
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            image: true,
            rating: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get delivery by ID
   */
  async getDeliveryById(userId: string, deliveryId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        order: true,
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            image: true,
            rating: true,
          },
        },
      },
    });

    if (!delivery || delivery.customerId !== userId) {
      throw new NotFoundException('Delivery not found');
    }

    return delivery;
  }

  /**
   * Cancel delivery
   */
  async cancelDelivery(userId: string, deliveryId: string, dto: CancelTripDto) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery || delivery.customerId !== userId) {
      throw new NotFoundException('Delivery not found');
    }

    if (['DELIVERED', 'CANCELLED'].includes(delivery.status)) {
      throw new BadRequestException(
        `Cannot cancel delivery with status: ${delivery.status}`,
      );
    }

    await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: 'CANCELLED',
      },
    });

    // Emit cancellation event
    this.eventBus.emitDeliveryCancelled({
      deliveryId,
      customerId: userId,
      driverId: delivery.riderId || undefined,
      orderId: delivery.orderId || undefined,
      cancelledBy: 'customer',
      reason: dto.reason,
      cancelledAt: Date.now(),
    });

    this.logger.log(`Delivery ${deliveryId} cancelled by customer ${userId}`);

    return { message: 'Delivery cancelled successfully' };
  }
}
