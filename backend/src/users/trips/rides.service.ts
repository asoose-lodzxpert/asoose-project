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
import { rideToJobSummary } from '../../riders/jobs/job.dto';
import { DriverStateService } from '../../matching/driver-state/driver-state.service';
import { PaymentInitService } from '../../payment/payment-init.service';
import {
  PaymentGateway,
  PaymentMethod as GatewayPaymentMethod,
  PaymentType,
} from '../../payment/interfaces/payment.interface';

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
    private readonly driverStateService: DriverStateService,
    private readonly paymentInitService: PaymentInitService,
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
            RideStatus.REQUESTED,
            RideStatus.SEARCHING_DRIVER,
            RideStatus.DRIVER_ACCEPTED,
            RideStatus.PAID,
            RideStatus.IN_PROGRESS,
          ] as RideStatus[],
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

    // 1. Validate Vehicle Type synchronously before any I/O
    if (!Object.values(VehicleType).includes(dto.vehicleType)) {
      throw new BadRequestException('Invalid vehicle type requested.');
    }

    // 2. Resolve addresses + check for an active ride in parallel.
    //    All three are independent — running them sequentially wasted ~2-8 s
    //    on every request due to back-to-back Google Maps round-trips.
    const [securePickup, secureDropoff, activeRide] = await Promise.all([
      this.common.resolveSecureLocation(dto.pickupLocation),
      this.common.resolveSecureLocation(dto.dropoffLocation),
      this.prisma.ride.findFirst({
        where: {
          customerId: userId,
          status: {
            in: [
              RideStatus.REQUESTED,
              RideStatus.SEARCHING_DRIVER,
              RideStatus.DRIVER_ACCEPTED,
              RideStatus.PAID,
              RideStatus.IN_PROGRESS,
            ] as RideStatus[],
          },
        },
      }),
    ]);

    if (activeRide) {
      throw new ConflictException('You already have an active ride request');
    }

    return this.prisma
      .$transaction(
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

          // 8. Create Ride at REQUESTED and start matching immediately
          const ride = await tx.ride.create({
            data: {
              customerId: userId,
              pickupAddressId: pickupAddress.id,
              dropoffAddressId: dropoffAddress.id,
              status: RideStatus.REQUESTED,
              idempotencyKey,
              distanceKm,
              durationMin,
              totalFare: finalFare,
              startOtp: rawOtp,
              surgeMultiplier: 1.0,
            },
            include: { pickupAddress: true, dropoffAddress: true },
          });

          // Payment is initiated AFTER the ride is completed (post-ride payment model).
          // No placeholder payment is created at request time.

          return {
            ride,
            fare: finalFare,
            payment: null,
            message: 'Ride requested. Searching for a driver.',
          };
        },
        { isolationLevel: 'Serializable' },
      )
      .then(async (result) => {
        // Start matching outside transaction so it is non-blocking
        this.triggerMatchingSideEffects(result.ride.id, userId).catch((err) => {
          this.logger.error(
            `Failed to trigger matching for ride ${result.ride.id}`,
            err,
          );
        });
        return result;
      });
  }

  /**
   * confirmRide — initiates the Paystack payment for a COMPLETED ride.
   * Post-ride payment model: the customer pays only after the ride is finished.
   * Returns { authorizationUrl, reference } so the web app can redirect to Paystack.
   */
  async confirmRide(userId: string, rideId: string, _paymentMethod?: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { customer: { select: { email: true, name: true } } },
    });

    if (!ride || ride.customerId !== userId) {
      throw new NotFoundException('Ride not found');
    }

    // Idempotency: already paid — return the existing authorization URL
    const existingPayment = await this.prisma.payment.findUnique({
      where: { rideId },
      select: { authorizationUrl: true, reference: true, status: true },
    });
    if (existingPayment?.status === PaymentStatus.COMPLETED) {
      return {
        status: 'ALREADY_PAID',
        rideId,
        authorizationUrl: existingPayment.authorizationUrl,
        reference: existingPayment.reference,
      };
    }

    // Post-ride payment: only allow from COMPLETED status
    if ((ride.status as string) !== 'COMPLETED') {
      throw new BadRequestException(
        `Cannot initiate payment for ride in state ${ride.status}`,
      );
    }

    const customerEmail = ride.customer?.email ?? `user-${userId}@asoose.app`;

    const payment = await this.paymentInitService.initiatePayment(
      {
        type: PaymentType.RIDE,
        rideId,
        email: customerEmail,
        customerName: ride.customer?.name ?? undefined,
        gateway: PaymentGateway.PAYSTACK,
        method: GatewayPaymentMethod.CARD,
      },
      userId,
    );

    await this.common.logActivity(userId, 'RIDE_PAYMENT_INITIATED', { rideId });
    return {
      rideId,
      authorizationUrl: payment.authorizationUrl,
      reference: payment.reference,
    };
  }

  private async triggerMatchingSideEffects(rideId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { pickupAddress: true, dropoffAddress: true },
    });
    if (!ride) return;

    // Transition to SEARCHING_DRIVER
    await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: 'SEARCHING_DRIVER' as any },
    });

    // Broadcast to admin dashboard
    this.notificationsGateway.sendToAdminRoom({
      id: rideId,
      type: 'RIDE',
      category: 'RIDE_REQUESTED',
      title: 'New Ride Request',
      message: `A ride (${rideId.substring(0, 8)}…) is now searching for a driver`,
      isRead: false,
      createdAt: new Date().toISOString(),
      metadata: { rideId },
    });

    try {
      this.notificationsGateway.server
        .to(`user_${userId}`)
        .emit('ride_update', {
          type: 'SEARCHING_DRIVER',
          status: 'SEARCHING_DRIVER',
          rideId: ride.id,
          label: 'Searching for a Driver',
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

    // Accept from SEARCHING_DRIVER state → DRIVER_ACCEPTED
    const result = await this.prisma.ride.updateMany({
      where: {
        id: rideId,
        status: 'SEARCHING_DRIVER' as any,
        riderId: null,
      },
      data: {
        status: 'DRIVER_ACCEPTED' as any,
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

    // Socket notification is handled by jobs.service.ts (canonical rider-side path).
    // This endpoint is for admin/legacy use only — do not double-emit DRIVER_ACCEPTED.
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
    // Post-ride payment model: ride starts from DRIVER_ACCEPTED (no upfront payment).
    // PAID is kept for backward compatibility with legacy pre-paid rides.
    const startableStatuses = ['DRIVER_ACCEPTED', 'PAID'];
    if (!startableStatuses.includes(ride.status as string))
      throw new BadRequestException(
        `Ride is not ready to start (status: ${ride.status})`,
      );

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

    // Socket notification (TRIP_STARTED) is handled by jobs.service.ts — do not double-emit.
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

      await tx.ride.update({
        where: { id: rideId },
        data: {
          status: RideStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      // Post-ride payment model: driver earnings are recorded when the
      // customer's payment is confirmed via the Paystack webhook
      // (see payment-status.service.ts). No wallet update here.

      // Socket notification (TRIP_COMPLETED) is handled by jobs.service.ts — do not double-emit.
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

    // Only cancellable if not already terminal or in progress
    const cancellableStatuses = [
      'REQUESTED',
      'SEARCHING_DRIVER',
      'DRIVER_ASSIGNED', // admin manual assignment (driver not yet accepted)
      'DRIVER_ACCEPTED',
      'PAID',
    ] as string[];

    // Fetch current ride first so we can get the riderId and validate ownership
    const existingRide = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: { id: true, customerId: true, riderId: true, status: true },
    });

    if (!existingRide) {
      throw new NotFoundException('Ride not found');
    }
    if (existingRide.customerId !== userId) {
      throw new ForbiddenException('You do not own this ride');
    }

    // Idempotency: already cancelled — return success so the client UI can update
    const alreadyCancelled = [
      'CANCELLED_BY_USER',
      'CANCELLED_BY_DRIVER',
      'CANCELLED',
    ];
    if (alreadyCancelled.includes(existingRide.status as string)) {
      this.logger.debug(
        `cancelRide idempotent — ride ${rideId} already ${existingRide.status}`,
      );
      return { message: 'Ride cancelled' };
    }

    if (!cancellableStatuses.includes(existingRide.status as string)) {
      throw new BadRequestException(
        `Cannot cancel a ride in '${existingRide.status}' status`,
      );
    }

    await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        status: 'CANCELLED_BY_USER' as any,
        cancelledBy: 'CUSTOMER',
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
    });

    // Shared event payload for all sockets
    const cancelPayload = {
      type: 'RIDE_CANCELLED',
      rideId,
      cancelledBy: 'CUSTOMER',
      reason,
    };

    try {
      // Notify the customer
      this.notificationsGateway.server
        .to(`user_${userId}`)
        .emit('RIDE_CANCELLED', cancelPayload);

      // Determine which driver to notify:
      // - If the driver already accepted: riderId is set in the DB.
      // - If the driver was locked by matching but hasn't accepted yet:
      //   riderId is null in DB but pendingDriver key exists in Redis.
      const assignedDriverId =
        existingRide.riderId ??
        (await this.driverStateService
          .getPendingDriverForRide(rideId)
          .catch(() => null));

      if (assignedDriverId) {
        // Notify driver — they may be showing the incoming job offer
        this.notificationsGateway.server
          .to(`user_${assignedDriverId}`)
          .emit('RIDE_CANCELLED', cancelPayload);
        this.logger.log(
          `[cancelRide] Notified driver ${assignedDriverId} of customer cancellation`,
        );

        // Reset driver's Redis state so they become available for new matches
        try {
          await this.driverStateService.releaseDriver(assignedDriverId, rideId);
        } catch (redisErr) {
          // Non-fatal — DB cancel succeeded; log and continue
          this.logger.error(
            `[cancelRide] Failed to release driver ${assignedDriverId} from Redis`,
            redisErr,
          );
        }
      }
    } catch (e) {
      this.logger.error('Socket error cancelRide', e);
    }

    // Emit event so rider-dispatch.listener can create a dispute if payment was made
    this.eventBus.emit('job.cancelled', {
      jobId: rideId,
      jobType: 'ride',
      cancelledBy: 'customer' as const,
      reason,
      customerId: userId,
    });

    await this.common.logActivity(userId, 'RIDE_CANCELLED', { rideId, reason });
    return { message: 'Ride cancelled' };
  }

  async getCurrentRide(userId: string) {
    return this.prisma.ride.findFirst({
      where: {
        customerId: userId,
        status: {
          in: [
            'REQUESTED',
            'SEARCHING_DRIVER',
            'DRIVER_ASSIGNED',
            'DRIVER_ACCEPTED',
            'IN_PROGRESS',
            // Post-ride payment model: include COMPLETED so the payment screen
            // is still shown if the customer re-opens the app before paying.
            'COMPLETED',
            // PAID is intentionally excluded: a PAID ride is fully done.
            // Including it caused useRideSynchronization to restore "finished"
            // state after the user had already rated and reset to "idle",
            // making the rating modal re-appear every time the page was visited.
          ] as any[],
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
        payment: { select: { status: true, method: true } },
      },
    });
  }

  async getDriverLocation(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: { customerId: true, riderId: true },
    });

    if (!ride || ride.customerId !== userId)
      throw new NotFoundException('Ride not found');
    if (!ride.riderId) return null;

    // Prefer Redis — location pings are stored there in real-time.
    // The DB columns (currentLat/currentLng) are only updated on status changes
    // and are therefore stale between pings.
    try {
      const state = await this.driverStateService.getState(ride.riderId);
      if (state?.location?.lat && state?.location?.lng) {
        return {
          latitude: state.location.lat,
          longitude: state.location.lng,
          heading: (state.location as any).heading ?? 0,
        };
      }
    } catch {
      // Fall through to DB
    }

    // Fallback: DB columns (may be null if driver never updated status with coords)
    const rider = await this.prisma.rider.findUnique({
      where: { id: ride.riderId },
      select: { currentLat: true, currentLng: true },
    });

    if (!rider?.currentLat || !rider?.currentLng) return null;

    return {
      latitude: rider.currentLat,
      longitude: rider.currentLng,
      heading: 0,
    };
  }

  /**
   * driverArrived — kept for legacy clients but no longer changes status
   * since the ARRIVED state has been removed from the active flow.
   * The driver can notify the customer via socket without a state transition.
   */
  async driverArrived(rideId: string, riderId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { pickupAddress: true },
    });

    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.riderId !== riderId)
      throw new ForbiddenException('Unauthorized driver');

    // Only valid from DRIVER_ACCEPTED (no state change)
    const validStatuses: string[] = ['DRIVER_ACCEPTED'];
    if (!validStatuses.includes(ride.status as string)) {
      throw new BadRequestException(
        `Cannot notify arrival from status ${ride.status}`,
      );
    }

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
    return { success: true, message: 'Customer notified of driver arrival' };
  }

  /**
   * reviewRide — post-trip review (replaces rateRide for new flow).
   * Can only be submitted for COMPLETED rides.
   */
  async reviewRide(
    userId: string,
    rideId: string,
    rating: number,
    comment?: string,
  ) {
    return this.rateRide(userId, rideId, rating, comment);
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
          in: ['DRIVER_ACCEPTED', 'PAID', 'IN_PROGRESS'] as any[],
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
        status: 'SEARCHING_DRIVER' as any,
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
