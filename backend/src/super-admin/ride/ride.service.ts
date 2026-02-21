import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RideFilterDto } from './dto/ride-filter.dto';
import { Prisma, RideStatus } from '@prisma/client';
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';
import { TripsService } from 'src/users/trips/trips.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
// ✅ Type-safe query fragments for performance
const rideListInclude = {
  include: {
    customer: { select: { id: true, name: true, image: true } },
    rider: {
      select: {
        id: true,
        name: true,
        image: true,
        phone: true,
        rating: true,
        vehicle: { select: { brand: true, model: true, color: true } },
      },
    },
    pickupAddress: { select: { street: true, city: true } },
    dropoffAddress: { select: { street: true, city: true } },
  },
} as const;

const rideDetailInclude = {
  include: {
    customer: true,
    rider: {
      include: {
        vehicle: true,
      },
    },
    pickupAddress: true,
    dropoffAddress: true,
    payment: true,
  },
} as const;

type RideWithListRelations = Prisma.RideGetPayload<typeof rideListInclude>;
type RideWithDetailRelations = Prisma.RideGetPayload<typeof rideDetailInclude>;

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);

  constructor(
    private prisma: PrismaService,
    private ledgerService: TransactionLedgerService,
    private tripsService: TripsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // 📋 1. List All Rides (Paginated & Filtered)
  async findAll(query: RideFilterDto) {
    const { search, status, from, to, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build Search Query
    const where: Prisma.RideWhereInput = {
      ...(search && {
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { rider: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(status &&
        status !== 'All' && {
          status: status as RideStatus,
        }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(new Date(from).setHours(0, 0, 0, 0)) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };

    const [rides, total] = await Promise.all([
      this.prisma.ride.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        ...rideListInclude,
      }),
      this.prisma.ride.count({ where }),
    ]);

    return {
      data: rides.map(this.transformRideForList),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  // 🔍 2. Get Single Ride Details
  async findOne(id: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      ...rideDetailInclude,
    });

    if (!ride) {
      throw new NotFoundException(`Ride #${id} not found`);
    }

    return this.transformRideForDetail(ride);
  }

  // ✅ 3. Complete Ride (Triggers Ledger Recording)
  async completeRide(id: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: {
        payment: true,
        rider: { select: { id: true } },
        customer: { select: { id: true } },
      },
    });

    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.status === 'COMPLETED') {
      throw new BadRequestException('Ride already completed');
    }
    if (!ride.rider) {
      throw new BadRequestException('Ride has no assigned rider');
    }

    // ✅ FIX: Capture rider here so TS knows it's not null inside transaction
    const rider = ride.rider;

    return this.prisma.$transaction(async (tx) => {
      // 1. Calculate fees (if not already set)
      const totalFare = ride.totalFare || 0;
      const platformFeeRate = 0.2; // 20% platform fee
      const platformFee = ride.platformFee || totalFare * platformFeeRate;
      const driverFee = ride.driverFee || totalFare - platformFee;

      // 2. Update ride status and fees
      const updatedRide = await tx.ride.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          platformFee,
          driverFee,
        },
      });

      // 3. Record payment in ledger (if payment exists and is completed)
      if (ride.payment && ride.payment.status === 'COMPLETED') {
        await this.ledgerService.recordPayment({
          id: ride.payment.id,
          amount: ride.payment.amount,
          userId: ride.customer.id,
          rideId: ride.id,
          method: ride.payment.method,
          status: ride.payment.status,
        });

        // 4. Record ride earnings (platform fee + driver earnings)
        await this.ledgerService.recordRideEarnings({
          id: ride.id,
          riderId: rider.id, // ✅ Use captured 'rider'
          totalFare,
          platformFee,
          driverFee,
        });
      }

      // 5. Log activity
      await tx.activityLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'RIDE_COMPLETED',
          target: id,
          metadata: {
            completedAt: new Date().toISOString(),
            totalFare,
            platformFee,
            driverFee,
          },
        },
      });

      return updatedRide;
    });
  }

  // 🚫 4. Cancel Ride (With Refund Handling)
  async cancel(id: string, adminUserId?: string, reason?: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: {
        payment: true,
        customer: { select: { id: true } },
      },
    });

    if (!ride) throw new NotFoundException(`Ride #${id} not found`);

    if (['COMPLETED', 'CANCELLED'].includes(ride.status)) {
      throw new BadRequestException(
        `Cannot cancel ride with status: ${ride.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Cancel the ride
      await tx.ride.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: adminUserId || 'SUPER_ADMIN',
          cancellationReason: reason || 'Cancelled by Super Admin',
        },
      });

      // 2. Process refund if payment was completed
      if (ride.payment && ride.payment.status === 'COMPLETED') {
        // Update payment status to refunded
        await tx.payment.update({
          where: { id: ride.payment.id },
          data: { status: 'REFUNDED' },
        });

        // Record refund in ledger
        await this.ledgerService.recordRefund({
          id: ride.payment.id,
          amount: ride.payment.amount,
          userId: ride.customer.id,
          rideId: ride.id,
        });
      }

      // 3. Log activity
      await tx.activityLog.create({
        data: {
          userId: adminUserId || 'SUPER_ADMIN',
          action: 'RIDE_CANCELLED',
          target: id,
          metadata: {
            reason: reason || 'Cancelled by Super Admin',
            refunded: ride.payment?.status === 'COMPLETED',
          },
        },
      });
    });
  }

  // 💰 5. Process Ride Refund (Partial or Full)
  async refundRide(
    id: string,
    refundAmount?: number,
    reason?: string,
    adminUserId?: string,
  ) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: {
        payment: true,
        customer: { select: { id: true } },
      },
    });

    if (!ride) throw new NotFoundException('Ride not found');

    if (!ride.payment) {
      throw new BadRequestException('No payment found for this ride');
    }

    if (ride.payment.status !== 'COMPLETED') {
      throw new BadRequestException('Can only refund completed payments');
    }

    // ✅ FIX: Capture payment here so TS ensures it's not null inside transaction
    const payment = ride.payment;

    const amountToRefund = refundAmount || payment.amount;

    if (amountToRefund > payment.amount) {
      throw new BadRequestException('Refund amount exceeds payment amount');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update payment status
      await tx.payment.update({
        where: { id: payment.id }, // ✅ Use captured 'payment'
        data: {
          status:
            amountToRefund === payment.amount
              ? 'REFUNDED'
              : 'PARTIALLY_REFUNDED',
        },
      });

      // 2. Record refund in ledger
      await this.ledgerService.recordRefund({
        id: payment.id, // ✅ Use captured 'payment'
        amount: amountToRefund,
        userId: ride.customer.id,
        rideId: ride.id,
      });

      // 3. Log activity
      await tx.activityLog.create({
        data: {
          userId: adminUserId || 'ADMIN',
          action: 'REFUND_ISSUED',
          target: id,
          metadata: {
            amount: amountToRefund,
            reason: reason || 'Refund processed',
            isPartial: amountToRefund < payment.amount,
          },
        },
      });
    });
  }

  // 🛠️ Transformers

  private transformRideForList(ride: RideWithListRelations) {
    return {
      id: ride.id,
      driver: ride.rider
        ? {
            name: ride.rider.name,
            car: ride.rider.vehicle
              ? `${ride.rider.vehicle.brand} ${ride.rider.vehicle.model}`
              : 'Unknown Vehicle',
            rating: ride.rider.rating,
          }
        : null,
      passenger: ride.customer.name,
      from: ride.pickupAddress.street,
      to: ride.dropoffAddress.street,
      fare: ride.totalFare ? `$${ride.totalFare.toFixed(2)}` : '-',
      status:
        ride.status === 'IN_PROGRESS'
          ? 'In Progress'
          : ride.status.charAt(0) + ride.status.slice(1).toLowerCase(),
      time: ride.createdAt.toISOString(),
    };
  }

  private transformRideForDetail(ride: RideWithDetailRelations) {
    return {
      id: ride.id,
      status:
        ride.status === 'IN_PROGRESS'
          ? 'In Progress'
          : ride.status.charAt(0) + ride.status.slice(1).toLowerCase(),
      date: ride.createdAt.toLocaleDateString(),

      pickup: {
        address: `${ride.pickupAddress.street}, ${ride.pickupAddress.city}`,
        time: ride.startedAt
          ? ride.startedAt.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-',
        coords: { lat: ride.pickupAddress.lat, lng: ride.pickupAddress.lng },
      },

      dropoff: {
        address: `${ride.dropoffAddress.street}, ${ride.dropoffAddress.city}`,
        time: ride.completedAt
          ? ride.completedAt.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Est',
        coords: { lat: ride.dropoffAddress.lat, lng: ride.dropoffAddress.lng },
      },

      driver: ride.rider
        ? {
            name: ride.rider.name,
            id: ride.rider.id,
            phone: ride.rider.phone,
            rating: ride.rider.rating,
            image: ride.rider.image,
            vehicle: ride.rider.vehicle
              ? `${ride.rider.vehicle.color} ${ride.rider.vehicle.brand} ${ride.rider.vehicle.model}`
              : 'N/A',
            plate: ride.rider.vehicle?.plateNumber ?? 'N/A',
          }
        : null,

      passenger: {
        name: ride.customer.name,
        id: ride.customer.id,
        phone: ride.customer.phone,
        rating: 5.0,
        image: ride.customer.image,
      },

      fare: {
        base: ride.baseFare ? `$${ride.baseFare.toFixed(2)}` : '-',
        distance: ride.distanceFare ? `$${ride.distanceFare.toFixed(2)}` : '-',
        time: ride.timeFare ? `$${ride.timeFare.toFixed(2)}` : '-',
        discount: '$0.00',
        total: ride.totalFare ? `$${ride.totalFare.toFixed(2)}` : '-',
        method: ride.payment?.method ?? 'N/A',
      },

      timeline: [
        {
          status: 'Ride Requested',
          time: ride.createdAt.toLocaleTimeString(),
          done: true,
        },
        {
          status: 'Driver Assigned',
          time: ride.acceptedAt?.toLocaleTimeString() || '-',
          done: !!ride.acceptedAt,
        },
        {
          status: 'Trip Started',
          time: ride.startedAt?.toLocaleTimeString() || '-',
          done: !!ride.startedAt,
        },
        {
          status: 'Trip Completed',
          time: ride.completedAt?.toLocaleTimeString() || '-',
          done: !!ride.completedAt,
        },
      ],
    };
  }

  async manualAssignDriver(rideId: string, riderId: string, adminId: string) {
    // 1. Fetch Ride & Rider
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });
    if (!rider) throw new NotFoundException('Rider not found');

    // 2. Validate Ride State
    if (ride.riderId) {
      throw new BadRequestException(
        'Ride already has a driver. Unassign first.',
      );
    }
    if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(ride.status)) {
      throw new BadRequestException(
        `Cannot assign driver to ${ride.status} ride.`,
      );
    }

    // 3. Validate Rider Eligibility
    if (rider.role !== 'DRIVER') {
      throw new BadRequestException(
        'Selected user is not a ride-hailing driver. Only DRIVER-role users can be assigned to rides.',
      );
    }
    if (rider.status !== 'ACTIVE') {
      throw new BadRequestException('Driver account is not ACTIVE.');
    }
    // Note: We allow offline assignment in emergencies, but warn in UI.
    // Strict enforcement can be toggled here.

    // 4. Perform Assignment
    // We update the DB directly, then trigger notifications via TripsService if possible
    await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        riderId: riderId,
        status: 'ACCEPTED', // Move to Accepted state
        acceptedAt: new Date(),
      },
    });

    // 5. Audit Log
    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'DRIVER_MANUALLY_ASSIGNED',
        target: rideId,
        details: `Manually assigned rider ${rider.name} (${riderId})`,
        metadata: {
          rideId,
          riderId,
          previousStatus: ride.status,
        },
      },
    });

    // 6. Emit socket events — driver gets the job offer, customer gets driver info
    try {
      const fullRide = await this.prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          rider: { include: { vehicle: true } },
          customer: { select: { id: true, name: true } },
          pickupAddress: {
            select: { street: true, city: true, lat: true, lng: true },
          },
          dropoffAddress: { select: { street: true, city: true } },
        },
      });

      if (fullRide?.rider) {
        const pickupText = fullRide.pickupAddress
          ? `${fullRide.pickupAddress.street}, ${fullRide.pickupAddress.city}`
          : 'Pickup location';
        const dropoffText = fullRide.dropoffAddress
          ? `${fullRide.dropoffAddress.street}, ${fullRide.dropoffAddress.city}`
          : 'Dropoff location';

        // Notify driver: job assigned (shows ride offer card in app)
        this.notificationsGateway.server
          .to(`user_${riderId}`)
          .emit('job.assigned', {
            id: rideId,
            jobType: 'ride',
            customerName: fullRide.customer?.name || 'Customer',
            pickupAddress: pickupText,
            dropoffAddress: dropoffText,
            estimatedEarnings: fullRide.totalFare ?? 0,
            distance: fullRide.distanceKm ?? null,
            assignedByAdmin: true,
            timestamp: Date.now(),
          });

        this.notificationsGateway.server
          .to(`user_${fullRide.customerId}`)
          .emit('DRIVER_FOUND', {
            type: 'DRIVER_FOUND',
            metadata: {
              rideId,
              driver: {
                id: fullRide.rider.id,
                name: fullRide.rider.name,
                phone: fullRide.rider.phone,
                vehicle: fullRide.rider.vehicle ?? null,
              },
            },
          });

        this.logger.log(
          `Manual assignment sockets emitted — driver: ${riderId}, customer: ${fullRide.customerId}`,
        );
      }
    } catch (e) {
      // Non-fatal — DB is already updated
      this.logger.error('Socket emit failed after manual assignment', e);
    }

    return { success: true, message: 'Driver assigned successfully' };
  }

  // 🔧 6. Force Status Override (Super Admin Only)
  async forceStatus(
    id: string,
    status: RideStatus,
    adminId: string,
    reason?: string,
  ) {
    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (!ride) throw new NotFoundException(`Ride #${id} not found`);

    const previousStatus = ride.status;

    await this.prisma.ride.update({
      where: { id },
      data: { status },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: adminId || 'SUPER_ADMIN',
        action: 'RIDE_STATUS_OVERRIDE',
        target: id,
        metadata: {
          previousStatus,
          newStatus: status,
          reason: reason || 'Manual override by Super Admin',
        },
      },
    });

    return { success: true, previousStatus, newStatus: status };
  }
}
