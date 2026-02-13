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
  Prisma,
  TransactionType,
  TransactionStatus,
  WalletEntityType,
  PaymentStatus,
  PaymentMethod,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GeoService } from '../../matching/geo/geo.service';
import { EventBusService } from '../../matching/events/event-bus.service';
import { QueueService } from '../../matching/queue/queue.service';
import { NotificationsGateway } from '../../notifications/notifications.gateway';
import {
  RequestRideDto,
  CancelTripDto,
  RideEstimateDto,
  VehicleType,
} from './dto/trip.dto';
import { TripsCommonService, TRIPS_CONFIG } from './trips.common.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { rideToJobSummary } from '../../jobs/job.dto';

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly eventBus: EventBusService,
    private readonly queue: QueueService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly common: TripsCommonService,
  ) {}

  // ========================================
  // CORE RIDE FLOW
  // ========================================

  async getEstimate(dto: RideEstimateDto) {
    // ✅ FIX: Use Backend Resolver as Source of Truth
    const pickup = await this.common.resolveSecureLocation({
      addressText: 'Pickup', // Placeholder for resolver
      placeId: dto.pickupPlaceId,
      lat: dto.pickupLat,
      lng: dto.pickupLng,
    });

    const dropoff = await this.common.resolveSecureLocation({
      addressText: 'Dropoff', // Placeholder for resolver
      placeId: dto.dropoffPlaceId,
      lat: dto.dropoffLat,
      lng: dto.dropoffLng,
    });

    const estimates: Record<string, any> = {};
    const types = Object.values(VehicleType);

    const distanceKm = this.geo.calculateDistance(
      pickup.lat,
      pickup.lng,
      dropoff.lat,
      dropoff.lng,
    );
    const durationMin = Math.ceil(distanceKm * 3);

    for (const type of types) {
      let multiplier = 1;
      if (type === VehicleType.BUSINESS) multiplier = 1.5;
      if (type === VehicleType.ECONOMY) multiplier = 1.0;

      const fareDetails = this.geo.calculateFare(distanceKm, durationMin);

      estimates[type as string] = {
        estimatedFare: this.common.round(fareDetails.totalFare * multiplier),
        distance: distanceKm,
        duration: durationMin,
        breakdown: {
          baseFare: this.common.round(fareDetails.baseFare * multiplier),
          distanceFare: this.common.round(
            fareDetails.distanceFare * multiplier,
          ),
          timeFare: this.common.round(fareDetails.timeFare * multiplier),
          platformFee: fareDetails.platformFee,
        },
        total: this.common.round(fareDetails.totalFare * multiplier),
      };
    }

    return estimates;
  }

  async requestRide(userId: string, dto: RequestRideDto) {
    this.logger.log(
      `Request Ride - User: ${userId}, DTO: ${JSON.stringify(dto, null, 2)}`,
    );

    // ✅ FIX: Discard client coordinates. Force strict backend resolution.
    const securePickup = await this.common.resolveSecureLocation(
      dto.pickupLocation,
    );
    const secureDropoff = await this.common.resolveSecureLocation(
      dto.dropoffLocation,
    );

    if (!Object.values(VehicleType).includes(dto.vehicleType)) {
      throw new BadRequestException('Invalid vehicle type');
    }

    const activeRide = await this.prisma.ride.findFirst({
      where: {
        customerId: userId,
        status: {
          in: [
            RideStatus.REQUESTED,
            RideStatus.ACCEPTED,
            RideStatus.IN_PROGRESS,
            RideStatus.ARRIVED,
          ],
        },
      },
    });

    if (activeRide) {
      throw new ConflictException('You already have an active ride request');
    }

    await this.prisma.ride.updateMany({
      where: {
        customerId: userId,
        status: RideStatus.PENDING,
      },
      data: {
        status: RideStatus.CANCELLED,
        cancellationReason: 'Overwritten by new request',
        cancelledBy: 'SYSTEM',
        cancelledAt: new Date(),
      },
    });

    return this.prisma.$transaction(
      async (tx) => {
        // 4. Create Addresses from trusted server data ONLY
        const pickupAddress = await tx.address.create({
          data: {
            userId,
            label: 'Pickup',
            street: this.common.sanitizeText(securePickup.address), // Trusted Maps text
            lat: securePickup.lat, // Trusted coordinate
            lng: securePickup.lng, // Trusted coordinate
            city: 'Unknown',
            state: 'Unknown',
          },
        });

        const dropoffAddress = await tx.address.create({
          data: {
            userId,
            label: 'Dropoff',
            street: this.common.sanitizeText(secureDropoff.address), // Trusted Maps text
            lat: secureDropoff.lat, // Trusted coordinate
            lng: secureDropoff.lng, // Trusted coordinate
            city: 'Unknown',
            state: 'Unknown',
          },
        });

        const distanceKm = this.geo.calculateDistance(
          pickupAddress.lat,
          pickupAddress.lng,
          dropoffAddress.lat,
          dropoffAddress.lng,
        );

        const durationMin = Math.ceil(distanceKm * 3);

        // 6. Security: Hash OTP
        const rawOtp = this.geo.generateOTP(TRIPS_CONFIG.OTP_LENGTH);
        const hashedOtp = await bcrypt.hash(rawOtp, this.SALT_ROUNDS);

        // 7. Create Ride
        const ride = await tx.ride.create({
          data: {
            customerId: userId,
            pickupAddressId: pickupAddress.id,
            dropoffAddressId: dropoffAddress.id,
            status: RideStatus.PENDING,
            distanceKm,
            durationMin,
            totalFare: this.common.round(dto.fare),
            startOtp: hashedOtp,
            surgeMultiplier: 1.0,
          },
          include: { pickupAddress: true, dropoffAddress: true },
        });

        // 8. Security: Cryptographically Secure Reference
        const secureReference = `REF-${randomUUID()}`;

        const payment = await tx.payment.create({
          data: {
            userId,
            rideId: ride.id,
            amount: ride.totalFare || 0,
            status: PaymentStatus.PENDING,
            method: PaymentMethod.CASH,
            reference: secureReference,
            gateway: 'SYSTEM',
          },
        });

        return {
          ride: { ...ride, startOtp: undefined },
          fare: dto.fare,
          payment,
          message: 'Ride created. Please confirm to find a driver.',
        };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async confirmRide(userId: string, rideId: string, paymentMethod: string) {
    const methodEnum =
      paymentMethod.toUpperCase() === 'CASH'
        ? PaymentMethod.CASH
        : PaymentMethod.CARD;

    return this.prisma.$transaction(async (tx) => {
      const ride = await tx.ride.findUnique({ where: { id: rideId } });

      if (!ride || ride.customerId !== userId) {
        throw new NotFoundException('Ride not found');
      }
      if (ride.status !== RideStatus.PENDING) {
        if (ride.status === RideStatus.REQUESTED)
          return { status: 'CONFIRMED', rideId };
        throw new BadRequestException(
          `Ride cannot be confirmed in state ${ride.status}`,
        );
      }

      await tx.payment.updateMany({
        where: { rideId: rideId },
        data: {
          method: methodEnum,
          status:
            methodEnum === PaymentMethod.CASH
              ? PaymentStatus.PENDING
              : PaymentStatus.COMPLETED,
        },
      });

      await tx.ride.update({
        where: { id: rideId },
        data: { status: RideStatus.REQUESTED },
      });

      this.triggerMatchingSideEffects(rideId, userId).catch((err) => {
        this.logger.error(`Failed to trigger matching for ride ${rideId}`, err);
      });

      return { status: 'CONFIRMED', rideId };
    });
  }

  private async triggerMatchingSideEffects(rideId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { pickupAddress: true, dropoffAddress: true },
    });
    if (!ride) return;

    try {
      this.notificationsGateway.server
        .to(`user_${userId}`)
        .emit('ride_update', {
          type: 'FINDING_DRIVER',
          status: 'FINDING_DRIVER',
          rideId: ride.id,
          label: 'Finding a Driver',
        });
    } catch (e) {
      this.logger.error(`Socket emit failed for ride ${rideId}`, e);
    }

    const job = rideToJobSummary(ride);
    const eventPayload = { job, attempt: 1 };
    this.eventBus.emitRideRequested({ rideId: job.id, ...eventPayload });
    await this.queue.enqueueRideMatching(eventPayload);
  }

  async acceptRide(rideId: string, riderId: string) {
    if (!riderId) throw new ForbiddenException('Rider identity missing');

    const result = await this.prisma.ride.updateMany({
      where: {
        id: rideId,
        status: RideStatus.REQUESTED,
        riderId: null,
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

    if (!ride?.rider)
      throw new InternalServerErrorException('Rider link failed');

    try {
      this.notificationsGateway.server
        .to(`user_${ride.customerId}`)
        .emit('DRIVER_FOUND', {
          type: 'DRIVER_FOUND',
          metadata: {
            rideId: ride.id,
            driver: {
              name: ride.rider.name,
              phone: this.common.maskPhoneNumber(ride.rider.phone),
              vehicle: ride.rider.vehicle,
              id: ride.rider.id,
            },
          },
        });
    } catch (e) {
      this.logger.error('Socket error during acceptRide', e);
    }

    await this.common.logActivity(riderId, 'RIDE_ACCEPTED', { rideId });
    return ride;
  }

  async startRide(rideId: string, riderId: string, otp: string) {
    await this.common.checkOtpRateLimit(rideId, 'start_ride');

    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: {
        id: true,
        riderId: true,
        status: true,
        startOtp: true,
        customerId: true,
      },
    });

    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.riderId !== riderId)
      throw new ForbiddenException('Unauthorized driver');
    if (ride.status !== RideStatus.ACCEPTED)
      throw new BadRequestException('Ride not ready to start');

    const isMatch = await bcrypt.compare(otp, ride.startOtp || '');
    if (!isMatch) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: RideStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    try {
      this.notificationsGateway.server
        .to(`user_${ride.customerId}`)
        .emit('TRIP_STARTED', { type: 'TRIP_STARTED', rideId });
    } catch (e) {
      this.logger.error('Socket error startRide', e);
    }

    await this.common.logActivity(riderId, 'RIDE_STARTED', { rideId });
    return { success: true };
  }

  async completeRide(
    rideId: string,
    riderId: string,
    lat: number,
    lng: number,
  ) {
    this.validateCoordinates(lat, lng);

    return this.prisma.$transaction(async (tx) => {
      const ride = await tx.ride.findUnique({
        where: { id: rideId },
        include: { dropoffAddress: true },
      });

      if (!ride) throw new NotFoundException('Ride not found');
      if (ride.riderId !== riderId)
        throw new ForbiddenException('Unauthorized');
      if (ride.status !== RideStatus.IN_PROGRESS)
        throw new BadRequestException('Ride not in progress');

      const dist = this.geo.calculateDistance(
        lat,
        lng,
        ride.dropoffAddress.lat,
        ride.dropoffAddress.lng,
      );

      if (dist > TRIPS_CONFIG.COMPLETION_RADIUS_KM) {
        throw new BadRequestException(
          `Too far from destination (${dist.toFixed(2)}km)`,
        );
      }

      const earning = this.common.round(
        Math.max(0, Number(ride.driverFee) || 0),
      );

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
          rideId: ride.id,
          status: TransactionStatus.COMPLETED,
          description: `Earnings for ride ${ride.id}`,
        },
      });

      try {
        this.notificationsGateway.server
          .to(`user_${ride.customerId}`)
          .emit('TRIP_COMPLETED', { type: 'TRIP_COMPLETED', rideId });
      } catch (e) {
        this.logger.error('Socket error completeRide', e);
      }

      return { message: 'Ride completed' };
    });
  }

  private validateCoordinates(lat: number, lng: number) {
    if (!this.geo.validateCoordinates(lat, lng)) {
      throw new BadRequestException(`Invalid coordinates: ${lat}, ${lng}`);
    }
  }

  async startRideMatching(rideId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (ride) await this.triggerMatchingSideEffects(rideId, ride.customerId);
  }

  async cancelRide(userId: string, rideId: string, dto: CancelTripDto) {
    const reason = this.common.sanitizeText(dto.reason);

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

    try {
      this.notificationsGateway.server
        .to(`user_${userId}`)
        .emit('RIDE_CANCELLED', { type: 'RIDE_CANCELLED', rideId });
    } catch (e) {
      this.logger.error('Socket error cancelRide', e);
    }

    await this.common.logActivity(userId, 'RIDE_CANCELLED', { rideId, reason });
    return { message: 'Ride cancelled' };
  }

  async getCurrentRide(userId: string) {
    return this.prisma.ride.findFirst({
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
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        rider: { include: { vehicle: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRideById(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        rider: { include: { vehicle: true } },
        payment: true,
      },
    });
    if (!ride || ride.customerId !== userId)
      throw new NotFoundException('Ride not found');
    if (ride.rider)
      ride.rider.phone = this.common.maskPhoneNumber(ride.rider.phone);
    return { ...ride, startOtp: undefined };
  }

  async getUserRides(userId: string, status?: string, page = 1, limit = 20) {
    const { page: safePage, limit: safeLimit } = this.common.validatePagination(
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

  async getDriverLocation(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { rider: true },
    });

    if (!ride || ride.customerId !== userId)
      throw new NotFoundException('Ride not found');
    if (!ride.riderId) return { latitude: 0, longitude: 0, heading: 0 };

    const rider = await this.prisma.rider.findUnique({
      where: { id: ride.riderId },
      select: { currentLat: true, currentLng: true },
    });

    return {
      latitude: rider?.currentLat || 0,
      longitude: rider?.currentLng || 0,
      heading: 0,
    };
  }

  async driverArrived(rideId: string, riderId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { pickupAddress: true },
    });

    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.riderId !== riderId)
      throw new ForbiddenException('Unauthorized driver');

    if (ride.status !== RideStatus.ACCEPTED) {
      throw new BadRequestException(
        `Cannot mark arrived from status ${ride.status}`,
      );
    }

    await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: RideStatus.ARRIVED },
    });

    try {
      this.notificationsGateway.server
        .to(`user_${ride.customerId}`)
        .emit('DRIVER_ARRIVED', {
          type: 'DRIVER_ARRIVED',
          metadata: {
            rideId: ride.id,
            message: 'Your driver has arrived at the pickup location.',
          },
        });
    } catch (e) {
      this.logger.error('Socket error driverArrived', e);
    }

    await this.common.logActivity(riderId, 'DRIVER_ARRIVED', { rideId });
    return { success: true, message: 'Driver arrival confirmed' };
  }

  // --- JOBS SERVICE STUBS ---
  async findActiveRideForDriver(driverId: string): Promise<any> {
    return null;
  }
  async findIncomingRidesForDriver(driverId: string): Promise<any[]> {
    return [];
  }
  async updateRideStatus(rideId: string, status: string): Promise<any> {
    return null;
  }
  async declineRide(rideId: string, driverId: string): Promise<any> {
    return { success: false };
  }
  async arrivePickup(rideId: string, driverId: string): Promise<any> {
    return { success: false };
  }
  async confirmPickup(rideId: string, driverId: string): Promise<any> {
    return { success: false };
  }
  async arriveDropoff(rideId: string, driverId: string): Promise<any> {
    return { success: false };
  }
}
