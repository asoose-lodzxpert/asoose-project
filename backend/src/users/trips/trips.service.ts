import { Injectable } from '@nestjs/common';
import { RidesService } from './rides.service';
import { DeliveriesService } from './deliveries.service';
import {
  RequestRideDto,
  RequestDeliveryDto,
  CancelTripDto,
  RideEstimateDto,
} from './dto/trip.dto';

@Injectable()
export class TripsService {
  constructor(
    private readonly ridesService: RidesService,
    private readonly deliveriesService: DeliveriesService,
  ) {}

  // ========================================
  // RIDE DELEGATION
  // ========================================

  async getRideEstimate(dto: RideEstimateDto) {
    return this.ridesService.getEstimate(dto);
  }

  async requestRide(userId: string, dto: RequestRideDto) {
    return this.ridesService.requestRide(userId, dto);
  }

  // FIX: Added method required by TripsController
  async confirmRide(userId: string, rideId: string, paymentMethod: string) {
    return this.ridesService.confirmRide(userId, rideId, paymentMethod);
  }

  async getCurrentRide(userId: string) {
    return this.ridesService.getCurrentRide(userId);
  }

<<<<<<< HEAD
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
          throw new ConflictException(
            'You already have an active ride request',
          );
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
          (dropoffAddress.userId !== userId &&
            !(dropoffAddress as any).isPublic)
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
=======
  async getDriverLocation(userId: string, rideId: string) {
    return this.ridesService.getDriverLocation(userId, rideId);
>>>>>>> ride_refactored
  }

  async startRideMatching(rideId: string) {
    return this.ridesService.startRideMatching(rideId);
  }

  async acceptRide(rideId: string, riderId: string) {
<<<<<<< HEAD
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

    if (!ride?.rider)
      throw new InternalServerErrorException('Rider link failed');

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
=======
    return this.ridesService.acceptRide(rideId, riderId);
>>>>>>> ride_refactored
  }

  async startRide(rideId: string, riderId: string, otp: string) {
    return this.ridesService.startRide(rideId, riderId, otp);
  }

<<<<<<< HEAD
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
=======
  async completeRide(rideId: string, riderId: string, lat: number, lng: number) {
    return this.ridesService.completeRide(rideId, riderId, lat, lng);
>>>>>>> ride_refactored
  }

  async cancelRide(userId: string, rideId: string, dto: CancelTripDto) {
    return this.ridesService.cancelRide(userId, rideId, dto);
  }

  async getUserRides(userId: string, status?: string, page = 1, limit = 20) {
    return this.ridesService.getUserRides(userId, status, page, limit);
  }

<<<<<<< HEAD
      const deliveryFee = this.geo.calculateDeliveryFee(
        distanceKm,
        dto.weightKg || 1,
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
=======
  async getRideById(userId: string, rideId: string) {
    return this.ridesService.getRideById(userId, rideId);
  }

  // ========================================
  // DELIVERY DELEGATION
  // ========================================
>>>>>>> ride_refactored

  async requestDelivery(userId: string, dto: RequestDeliveryDto) {
    return this.deliveriesService.requestDelivery(userId, dto);
  }

  async startDeliveryMatching(deliveryId: string) {
    return this.deliveriesService.startDeliveryMatching(deliveryId);
  }

  async assignDriver(deliveryId: string, riderId: string) {
<<<<<<< HEAD
    if (!riderId) throw new ForbiddenException();

    const result = await this.prisma.delivery.updateMany({
      where: { id: deliveryId, status: DeliveryStatus.REQUESTED },
      data: {
        status: DeliveryStatus.ASSIGNED,
        riderId,
        assignedAt: new Date(),
      },
    });
=======
    return this.deliveriesService.assignDriver(deliveryId, riderId);
  }
>>>>>>> ride_refactored

  async acceptDelivery(deliveryId: string, riderId: string) {
    return this.deliveriesService.acceptDelivery(deliveryId, riderId);
  }

  async confirmPickup(deliveryId: string, riderId: string, proof: string) {
    return this.deliveriesService.confirmPickup(deliveryId, riderId, proof);
  }

  async completeDelivery(
    deliveryId: string,
    riderId: string,
    otp: string,
    proof: string,
    lat: number,
    lng: number,
  ) {
    return this.deliveriesService.completeDelivery(deliveryId, riderId, otp, proof, lat, lng);
  }

  async cancelDelivery(userId: string, deliveryId: string, dto: CancelTripDto) {
    return this.deliveriesService.cancelDelivery(userId, deliveryId, dto);
  }

  async getUserDeliveries(userId: string, status?: string, page = 1, limit = 20) {
    return this.deliveriesService.getUserDeliveries(userId, status, page, limit);
  }

  async getDeliveryById(userId: string, deliveryId: string) {
    return this.deliveriesService.getDeliveryById(userId, deliveryId);
  }
<<<<<<< HEAD

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
          // Make sure frontend listens for this event
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
=======
  async driverArrived(rideId: string, riderId: string) {
    return this.ridesService.driverArrived(rideId, riderId);
>>>>>>> ride_refactored
  }
}
