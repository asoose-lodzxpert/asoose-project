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
import { randomUUID } from 'crypto';
import { rideToJobSummary } from '../../jobs/job.dto';

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);

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

  async requestRide(
    userId: string,
    dto: RequestRideDto,
    idempotencyKey: string,
  ) {
    this.logger.log(
      `Request Ride - User: ${userId}, Vehicle: ${dto.vehicleType}, IdempotencyKey: ${idempotencyKey}`,
    );

    try {
      return await this._requestRideImpl(userId, dto, idempotencyKey);
    } catch (error: any) {
      // Re-throw NestJS HTTP exceptions (BadRequest, Conflict, etc.) as-is
      if (error?.getStatus && typeof error.getStatus === 'function') {
        throw error;
      }
      // Prisma-specific errors
      if (error?.code) {
        this.logger.error(
          `Prisma error in requestRide: code=${error.code}, meta=${JSON.stringify(error.meta)}, message=${error.message}`,
        );
        throw new InternalServerErrorException(
          `Database error: ${error.code} — ${error.meta?.cause || error.message}`,
        );
      }
      // Unknown errors
      this.logger.error(
        `Unexpected error in requestRide: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Ride creation failed: ${error.message}`,
      );
    }
  }

  private async _requestRideImpl(
    userId: string,
    dto: RequestRideDto,
    idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException(
        'Idempotency key is required to prevent duplicate requests.',
      );
    }

    // Early DB health check — fast-fail with a clear error instead of 500
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new InternalServerErrorException(
        'Database is currently unavailable. Please try again shortly.',
      );
    }

    // Check idempotency: find a ride with same key in non-terminal status
    const existingRequest = await this.prisma.ride.findFirst({
      where: {
        customerId: userId,
        idempotencyKey,
        status: {
          in: [
            RideStatus.PENDING,
            RideStatus.REQUESTED,
            RideStatus.ACCEPTED,
            RideStatus.ARRIVED,
            RideStatus.IN_PROGRESS,
          ],
        },
      },
      include: { pickupAddress: true, dropoffAddress: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });

    if (existingRequest) {
      this.logger.log(
        `Idempotency match found for key: ${idempotencyKey}. Returning cached ride ${existingRequest.id}.`,
      );
      return {
        ride: { ...existingRequest, startOtp: undefined },
        fare: existingRequest.totalFare,
        payment: existingRequest.payment || null,
        message: 'Ride request recovered from previous attempt.',
      };
    }

    // 1. Securely resolve addresses (DO NOT trust raw client coords)
    const securePickup = await this.common.resolveSecureLocation(
      dto.pickupLocation,
    );
    const secureDropoff = await this.common.resolveSecureLocation(
      dto.dropoffLocation,
    );

    // 2. Validate Vehicle Type
    if (!Object.values(VehicleType).includes(dto.vehicleType)) {
      throw new BadRequestException('Invalid vehicle type requested.');
    }

    // 3. Prevent duplicate active rides
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

    // 4. Cleanup expired PENDING rides
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    await this.prisma.ride.updateMany({
      where: {
        customerId: userId,
        status: RideStatus.PENDING,
        createdAt: { lt: fiveMinutesAgo },
      },
      data: {
        status: RideStatus.CANCELLED,
        cancellationReason: 'Expired payment intent',
        cancelledBy: 'SYSTEM',
        cancelledAt: new Date(),
      },
    });

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
        // 5. Create trusted addresses
        const pickupAddress = await tx.address.create({
          data: {
            userId,
            label: 'Pickup',
            street: this.common.sanitizeText(securePickup.address),
            lat: securePickup.lat,
            lng: securePickup.lng,
            city: '',
            state: '',
          },
        });

        const dropoffAddress = await tx.address.create({
          data: {
            userId,
            label: 'Dropoff',
            street: this.common.sanitizeText(secureDropoff.address),
            lat: secureDropoff.lat,
            lng: secureDropoff.lng,
            city: '',
            state: '',
          },
        });

        // 6. Extract client-provided values
        const { fare, distanceKm, durationMin } = dto;

        // Basic validation
        if (fare <= 0 || distanceKm <= 0 || durationMin <= 0) {
          throw new BadRequestException('Invalid trip values provided.');
        }

        // Hard caps to prevent abuse
        const MAX_FARE = 1_000_000;
        const MAX_DISTANCE = 10000;
        const MAX_DURATION = 10000;

        if (fare > MAX_FARE) {
          throw new BadRequestException('Fare exceeds allowed limit.');
        }

        if (distanceKm > MAX_DISTANCE) {
          throw new BadRequestException('Distance exceeds allowed limit.');
        }

        if (durationMin > MAX_DURATION) {
          throw new BadRequestException('Duration exceeds allowed limit.');
        }

        // 🔐 Optional Anti-Tampering Check (Recommended)
        const serverDistance = this.geo.calculateDistance(
          pickupAddress.lat,
          pickupAddress.lng,
          dropoffAddress.lat,
          dropoffAddress.lng,
        );

        this.logger.log(`Server calculated distance: ${serverDistance} km`);
        this.logger.log(`Client provided distance: ${distanceKm} km`);

        const distanceDifference = Math.abs(serverDistance - distanceKm);

        // Allow tolerance (e.g., 1km difference)
        if (distanceDifference > 1) {
          throw new BadRequestException('Trip distance mismatch detected.');
        }

        const finalFare = this.common.round(fare);

        // 7. Generate OTP (stored as plaintext so customer can view it)
        const rawOtp = this.geo.generateOTP(TRIPS_CONFIG.OTP_LENGTH);

        // 8. Create Ride
        const ride = await tx.ride.create({
          data: {
            customerId: userId,
            pickupAddressId: pickupAddress.id,
            dropoffAddressId: dropoffAddress.id,
            status: RideStatus.PENDING,
            idempotencyKey,
            distanceKm,
            durationMin,
            totalFare: finalFare,
            startOtp: rawOtp,
            surgeMultiplier: 1.0,
          },
          include: { pickupAddress: true, dropoffAddress: true },
        });

        // 9. Create Payment
        const secureReference = `REF-${randomUUID()}`;

        const payment = await tx.payment.create({
          data: {
            userId,
            rideId: ride.id,
            amount: finalFare,
            status: PaymentStatus.PENDING,
            method: PaymentMethod.CASH,
            reference: secureReference,
            gateway: 'SYSTEM',
          },
        });

        return {
          ride,
          fare: finalFare,
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

      // Update payment method — always keep PENDING until real payment is confirmed
      await tx.payment.updateMany({
        where: { rideId: rideId },
        data: {
          method: methodEnum,
          status: PaymentStatus.PENDING,
        },
      });

      // CARD: ride stays PENDING — wait for Paystack payment before matching
      if (methodEnum === PaymentMethod.CARD) {
        return { status: 'AWAITING_PAYMENT', rideId };
      }

      // CASH: transition to REQUESTED and start driver matching immediately
      await tx.ride.update({
        where: { id: rideId },
        data: { status: RideStatus.REQUESTED },
      });

      // ✅ Broadcast new ride request to admin dashboard
      this.notificationsGateway.sendToAdminRoom({
        id: rideId,
        type: 'RIDE',
        category: 'RIDE_REQUESTED',
        title: 'New Ride Request',
        message: `A ride (${rideId.substring(0, 8)}…) has been confirmed and is awaiting a driver`,
        isRead: false,
        createdAt: new Date().toISOString(),
        metadata: { rideId },
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
    if (ride.status !== RideStatus.ACCEPTED && ride.status !== RideStatus.ARRIVED)
      throw new BadRequestException('Ride not ready to start');

    if (!ride.startOtp || otp.trim() !== ride.startOtp.trim()) {
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

      // driverFee may not be set on older rides — calculate from totalFare if missing
      const totalFare = Number(ride.totalFare) || 0;
      const platformFee =
        Number(ride.platformFee) || Math.round(totalFare * 0.2);
      const computedDriverFee = Math.max(0, totalFare - platformFee);
      const earning = this.common.round(
        Math.max(0, Number(ride.driverFee) || computedDriverFee),
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
            RideStatus.ARRIVED,
            RideStatus.IN_PROGRESS,
          ],
        },
      },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        rider: { include: { vehicle: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      // startOtp IS returned here so customer can display it to the driver
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
    // Return startOtp so customer can show it to driver when trip starts
    return ride;
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

  /**
   * Rate the driver for a completed ride.
   * Updates the rider's running average rating.
   */
  async rateRide(
    userId: string,
    rideId: string,
    rating: number,
    comment?: string,
  ) {
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new BadRequestException(
        'Rating must be an integer between 1 and 5',
      );
    }

    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: { customerId: true, riderId: true, status: true },
    });

    if (!ride || ride.customerId !== userId) {
      throw new NotFoundException('Ride not found');
    }
    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('Can only rate completed rides');
    }
    if (!ride.riderId) {
      throw new BadRequestException('No driver assigned to this ride');
    }

    // Update rider's running average: newAvg = (old * count + new) / (count + 1)
    const rider = await this.prisma.rider.findUnique({
      where: { id: ride.riderId },
      select: { rating: true, totalRides: true },
    });

    if (!rider) throw new NotFoundException('Rider not found');

    const oldAvg = rider.rating || 5.0;
    const count = rider.totalRides || 0;
    const newAvg = count > 0 ? (oldAvg * count + rating) / (count + 1) : rating;

    await this.prisma.rider.update({
      where: { id: ride.riderId },
      data: { rating: Math.round(newAvg * 100) / 100 },
    });

    await this.common.logActivity(userId, 'RIDE_RATED', {
      rideId,
      riderId: ride.riderId,
      rating,
      comment: comment ? this.common.sanitizeText(comment) : undefined,
    });

    return { success: true, message: 'Rating submitted' };
  }

  // --- JOBS SERVICE STUBS ---
  async findActiveRideForDriver(driverId: string): Promise<any> {
    return this.prisma.ride.findFirst({
      where: {
        riderId: driverId,
        status: {
          in: [RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.IN_PROGRESS],
        },
      },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        customer: true,
      },
    });
  }
  async findIncomingRidesForDriver(driverId: string): Promise<any[]> {
    return this.prisma.ride.findMany({
      where: {
        riderId: driverId,
        status: RideStatus.REQUESTED,
      },
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        customer: true,
      },
      take: 10,
    });
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
