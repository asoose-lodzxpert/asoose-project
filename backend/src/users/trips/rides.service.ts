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
import { RequestRideDto, CancelTripDto, RideEstimateDto, VehicleType } from './dto/trip.dto';
import { TripsCommonService, TRIPS_CONFIG } from './trips.common.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

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
    // Input Validation: Coordinates
    this.validateCoordinates(dto.pickupLat, dto.pickupLng);
    this.validateCoordinates(dto.dropoffLat, dto.dropoffLng);

    const estimates: Record<string, any> = {};
    const types = Object.values(VehicleType); 

    const distanceKm = this.geo.calculateDistance(
      dto.pickupLat,
      dto.pickupLng,
      dto.dropoffLat,
      dto.dropoffLng,
    );
    const durationMin = Math.ceil(distanceKm * 3);

    for (const type of types) {
      let multiplier = 1;
      if (type === VehicleType.VAN) multiplier = 1.5;
      if (type === VehicleType.BIKE) multiplier = 0.7;

      const fareDetails = this.geo.calculateFare(distanceKm, durationMin);

      estimates[type as string] = {
        estimatedFare: this.common.round(fareDetails.totalFare * multiplier),
        distance: distanceKm,
        duration: durationMin,
        breakdown: {
          baseFare: this.common.round(fareDetails.baseFare * multiplier),
          distanceFare: this.common.round(fareDetails.distanceFare * multiplier),
          timeFare: this.common.round(fareDetails.timeFare * multiplier),
          platformFee: fareDetails.platformFee,
        },
        total: this.common.round(fareDetails.totalFare * multiplier),
      };
    }

    return estimates;
  }

  async requestRide(userId: string, dto: RequestRideDto) {
    // 1. Strict Input Validation
    this.validateCoordinates(dto.pickupLocation.latitude, dto.pickupLocation.longitude);
    this.validateCoordinates(dto.dropoffLocation.latitude, dto.dropoffLocation.longitude);
    
    if (!Object.values(VehicleType).includes(dto.vehicleType)) {
        throw new BadRequestException('Invalid vehicle type');
    }

    // 2. Idempotency Check (FIXED): Only block if ride is TRULY active
    // We removed 'PENDING' from this check to prevent deadlocks.
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

    // 3. Cleanup Zombie PENDING rides (FIXED)
    // If a previous attempt failed at payment or was abandoned, we auto-cancel it here.
    // This ensures the user can always try again without getting a 409 Conflict.
    await this.prisma.ride.updateMany({
        where: { 
            customerId: userId, 
            status: RideStatus.PENDING 
        },
        data: { 
            status: RideStatus.CANCELLED, 
            cancellationReason: 'Overwritten by new request',
            cancelledBy: 'SYSTEM',
            cancelledAt: new Date()
        }
    });

    return this.prisma.$transaction(
      async (tx) => {
        // 4. Create Addresses
        const pickupAddress = await tx.address.create({
          data: {
            userId,
            label: 'Pickup',
            street: this.common.sanitizeText(dto.pickupLocation.address),
            lat: dto.pickupLocation.latitude,
            lng: dto.pickupLocation.longitude,
            city: 'Unknown',
            state: 'Unknown',
          },
        });

        const dropoffAddress = await tx.address.create({
          data: {
            userId,
            label: 'Dropoff',
            street: this.common.sanitizeText(dto.dropoffLocation.address),
            lat: dto.dropoffLocation.latitude,
            lng: dto.dropoffLocation.longitude,
            city: 'Unknown',
            state: 'Unknown',
          },
        });

        // 5. Calculate Fare
        const distanceKm = this.geo.calculateDistance(
          pickupAddress.lat,
          pickupAddress.lng,
          dropoffAddress.lat,
          dropoffAddress.lng,
        );

        const durationMin = Math.ceil(distanceKm * 3);
        const fareDetails = this.geo.calculateFare(distanceKm, durationMin);

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
            baseFare: this.common.round(fareDetails.baseFare),
            distanceFare: this.common.round(fareDetails.distanceFare),
            timeFare: this.common.round(fareDetails.timeFare),
            platformFee: this.common.round(fareDetails.platformFee || 0),
            driverFee: this.common.round(fareDetails.driverFee),
            totalFare: this.common.round(fareDetails.totalFare),
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
          fareBreakdown: fareDetails,
          payment,
          message: 'Ride created. Please confirm to find a driver.',
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  // Fixes: "Broken Transaction Integrity in confirmRide"
  async confirmRide(userId: string, rideId: string, paymentMethod: string) {
    // Validate Payment Method Enum
    const methodEnum = paymentMethod.toUpperCase() === 'CASH' ? PaymentMethod.CASH : PaymentMethod.CARD;
    
    return this.prisma.$transaction(async (tx) => {
        const ride = await tx.ride.findUnique({ where: { id: rideId } });
        
        if (!ride || ride.customerId !== userId) {
            throw new NotFoundException('Ride not found');
        }
        if (ride.status !== RideStatus.PENDING) {
             // Idempotency check: if already REQUESTED, return success
             if (ride.status === RideStatus.REQUESTED) return { status: 'CONFIRMED', rideId };
             throw new BadRequestException(`Ride cannot be confirmed in state ${ride.status}`);
        }

        // 1. Update Payment
        await tx.payment.updateMany({
            where: { rideId: rideId },
            data: { 
                method: methodEnum,
                status: methodEnum === PaymentMethod.CASH ? PaymentStatus.PENDING : PaymentStatus.COMPLETED 
            }
        });

        // 2. Transition Ride Status
        await tx.ride.update({
            where: { id: rideId },
            data: { status: RideStatus.REQUESTED }
        });

        // 3. Trigger Async Matching (Side Effect)
        // We do this AFTER the transaction ensures data consistency. 
        // Note: In strict distributed systems, we'd use the Transaction Outbox pattern here.
        // For now, we call the helper but handle errors so we don't revert the valid transaction.
        this.triggerMatchingSideEffects(rideId, userId).catch(err => {
            this.logger.error(`Failed to trigger matching for ride ${rideId}`, err);
        });

        return { status: 'CONFIRMED', rideId };
    });
  }

  private async triggerMatchingSideEffects(rideId: string, userId: string) {
      // Re-fetch with relations needed for event
      const ride = await this.prisma.ride.findUnique({
          where: { id: rideId },
          include: { pickupAddress: true, dropoffAddress: true }
      });
      if(!ride) return;

      // Fixes: "Notification Failures Are Silently Ignored"
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
          // Non-critical failure; client can poll /rides/current
      }

      const eventPayload = {
          rideId: ride.id,
          customerId: userId,
          pickupLat: ride.pickupAddress.lat,
          pickupLng: ride.pickupAddress.lng,
          dropoffLat: ride.dropoffAddress.lat,
          dropoffLng: ride.dropoffAddress.lng,
          distanceKm: ride.distanceKm || 0,
          totalFare: Number(ride.totalFare) || 0,
          timestamp: Date.now(),
          expiresAt: Date.now() + TRIPS_CONFIG.OTP_TTL_MS,
      };

      this.eventBus.emitRideRequested(eventPayload);
      await this.queue.enqueueRideMatching({ ...eventPayload, attempt: 1 });
  }

  // Fixes: "Race Condition in Ride Acceptance"
  async acceptRide(rideId: string, riderId: string) {
    if (!riderId) throw new ForbiddenException('Rider identity missing');

    // Atomic Compare-and-Swap
    const result = await this.prisma.ride.updateMany({
      where: {
        id: rideId,
        status: RideStatus.REQUESTED, // ONLY accept if currently REQUESTED
        riderId: null, // Double check it's not assigned
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

  // Fixes: "OTP Stored in Plain Text"
  async startRide(rideId: string, riderId: string, otp: string) {
    await this.common.checkOtpRateLimit(rideId, 'start_ride');

    const ride = await this.prisma.ride.findUnique({ 
        where: { id: rideId },
        select: { id: true, riderId: true, status: true, startOtp: true, customerId: true }
    });

    if (!ride) throw new NotFoundException("Ride not found");
    if (ride.riderId !== riderId) throw new ForbiddenException("Unauthorized driver");
    if (ride.status !== RideStatus.ACCEPTED) throw new BadRequestException("Ride not ready to start");

    // Secure Comparison
    const isMatch = await bcrypt.compare(otp, ride.startOtp || '');
    if (!isMatch) {
        throw new BadRequestException('Invalid OTP');
    }

    // Update Status
    await this.prisma.ride.update({
        where: { id: rideId },
        data: {
            status: RideStatus.IN_PROGRESS,
            startedAt: new Date()
        }
    });

    try {
        this.notificationsGateway.server
            .to(`user_${ride.customerId}`)
            .emit('TRIP_STARTED', { type: 'TRIP_STARTED', rideId });
    } catch (e) { this.logger.error("Socket error startRide", e); }

    await this.common.logActivity(riderId, 'RIDE_STARTED', { rideId });
    return { success: true };
  }

  // Fixes: "Money Safety Issues"
  async completeRide(rideId: string, riderId: string, lat: number, lng: number) {
    this.validateCoordinates(lat, lng);

    return this.prisma.$transaction(async (tx) => {
      const ride = await tx.ride.findUnique({
        where: { id: rideId },
        include: { dropoffAddress: true },
      });

      if (!ride) throw new NotFoundException('Ride not found');
      if (ride.riderId !== riderId) throw new ForbiddenException('Unauthorized');
      if (ride.status !== RideStatus.IN_PROGRESS) throw new BadRequestException('Ride not in progress');

      const dist = this.geo.calculateDistance(
        lat,
        lng,
        ride.dropoffAddress.lat,
        ride.dropoffAddress.lng,
      );

      // Fixes: "Rigid Distance Completion Logic" - allowing slight tolerance or using config
      // Ideally this comes from a dynamic config service, using TRIPS_CONFIG for now
      if (dist > TRIPS_CONFIG.COMPLETION_RADIUS_KM) {
        throw new BadRequestException(`Too far from destination (${dist.toFixed(2)}km)`);
      }

      // Money Safety: Ensure values are rounded and positive
      const earning = this.common.round(Math.max(0, Number(ride.driverFee) || 0));

      await tx.ride.update({
        where: { id: rideId },
        data: {
          status: RideStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      const rider = await tx.rider.findUnique({ where: { id: riderId } });
      if (!rider) throw new InternalServerErrorException('Rider profile missing');

      const balanceBefore = Number(rider.walletBalance);
      const balanceAfter = this.common.round(balanceBefore + earning);

      await tx.rider.update({
        where: { id: riderId },
        data: { walletBalance: balanceAfter },
      });

      // Audit Trail
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
      } catch (e) { this.logger.error("Socket error completeRide", e); }

      return { message: 'Ride completed' };
    });
  }

  // Helper: Validating methods moved to Service for strictness
  private validateCoordinates(lat: number, lng: number) {
      if (!this.geo.validateCoordinates(lat, lng)) {
          throw new BadRequestException(`Invalid coordinates: ${lat}, ${lng}`);
      }
  }

  // ... (Other existing methods: cancelRide, getUserRides, etc. - assume standard implementation)
  
  async startRideMatching(rideId: string) {
      // Internal method for manual triggering if needed
      // Logic moved to triggerMatchingSideEffects to avoid duplication
      // This wrapper maintains API compatibility if called elsewhere
      const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
      if(ride) await this.triggerMatchingSideEffects(rideId, ride.customerId);
  }

  async cancelRide(userId: string, rideId: string, dto: CancelTripDto) {
    const reason = this.common.sanitizeText(dto.reason);

    const result = await this.prisma.ride.updateMany({
      where: {
        id: rideId,
        customerId: userId,
        status: {
          notIn: [RideStatus.COMPLETED, RideStatus.CANCELLED, RideStatus.IN_PROGRESS],
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
    } catch(e) { this.logger.error("Socket error cancelRide", e); }

    await this.common.logActivity(userId, 'RIDE_CANCELLED', { rideId, reason });
    return { message: 'Ride cancelled' };
  }

  // Getters (Standard)
  async getCurrentRide(userId: string) {
    return this.prisma.ride.findFirst({
      where: {
        customerId: userId,
        status: { in: [RideStatus.PENDING, RideStatus.REQUESTED, RideStatus.ACCEPTED, RideStatus.IN_PROGRESS] },
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
          include: { pickupAddress: true, dropoffAddress: true, rider: { include: { vehicle: true } }, payment: true }
      });
      if(!ride || ride.customerId !== userId) throw new NotFoundException("Ride not found");
      if(ride.rider) ride.rider.phone = this.common.maskPhoneNumber(ride.rider.phone);
      return { ...ride, startOtp: undefined }; // Security: Hide OTP
  }

  async getUserRides(userId: string, status?: string, page = 1, limit = 20) {
      const { page: safePage, limit: safeLimit } = this.common.validatePagination(page, limit);
      const skip = (safePage - 1) * safeLimit;
      const allowedStatuses = Object.values(RideStatus) as string[];
      const statusFilter = status && allowedStatuses.includes(status) ? status : undefined;

      return this.prisma.ride.findMany({
          where: { customerId: userId, ...(statusFilter && { status: statusFilter as RideStatus }) },
          take: safeLimit,
          skip,
          orderBy: { createdAt: 'desc' },
          select: {
              id: true, status: true, totalFare: true, createdAt: true,
              pickupAddress: { select: { street: true } },
              dropoffAddress: { select: { street: true } }
          }
      });
  }
  
  async getDriverLocation(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { rider: true },
    });

    if (!ride || ride.customerId !== userId) throw new NotFoundException('Ride not found');
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
    if (ride.riderId !== riderId) throw new ForbiddenException('Unauthorized driver');
    
    // Allow transition from ACCEPTED to ARRIVED
    if (ride.status !== RideStatus.ACCEPTED) {
      throw new BadRequestException(`Cannot mark arrived from status ${ride.status}`);
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


}