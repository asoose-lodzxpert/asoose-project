import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getWalletBalance(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: { walletBalance: true },
    });
    if (!rider) {
      throw new NotFoundException('Rider not found');
    }
    return { balance: rider.walletBalance || 0 };
  }

  async getEarnings(riderId: string, timeframe: string = 'week') {
    const now = new Date();
    let startDate: Date;
    switch (timeframe) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: { rating: true, role: true },
    });
    let totalRides = 0;
    let rideFees = 0;
    const bonuses = 0;
    let serviceFees = 0;
    let avgPerRide = 0;
    let hoursOnline = 0;
    if (rider?.role === 'DRIVER') {
      // Get rides for driver, exclude PENDING and CANCELLED
      const rides = await this.prisma.ride.findMany({
        where: {
          riderId,
          status: { in: ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] },
          completedAt: { gte: startDate },
        },
        select: { totalFare: true, createdAt: true, completedAt: true },
      });
      totalRides = rides.length;
      rideFees = rides.reduce((sum, ride) => sum + (ride.totalFare || 0), 0);
      serviceFees = rideFees * -0.15;
      avgPerRide =
        totalRides > 0 ? (rideFees + bonuses + serviceFees) / totalRides : 0;
      hoursOnline = totalRides * 0.75;
    } else {
      const deliveries = await this.prisma.delivery.findMany({
        where: {
          riderId,
          status: 'DELIVERED',
          deliveredAt: { gte: startDate },
        },
        select: { deliveryFee: true, createdAt: true, deliveredAt: true },
      });
      totalRides = deliveries.length;
      rideFees = deliveries.reduce(
        (sum, delivery) => sum + (delivery.deliveryFee || 0),
        0,
      );
      serviceFees = rideFees * -0.15;
      avgPerRide =
        totalRides > 0 ? (rideFees + bonuses + serviceFees) / totalRides : 0;
      hoursOnline = totalRides * 0.75;
    }
    return {
      total: parseFloat((rideFees + bonuses + serviceFees).toFixed(2)),
      rides: totalRides,
      avgPerRide,
      hoursOnline,
      rating: rider?.rating || 0,
      breakdown: { rideFees, bonuses, serviceFees },
    };
  }

  async getOrdersHistory(
    riderId: string,
    role: 'RIDER' | 'DRIVER',
    status?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    // Default: exclude PENDING / REQUESTED (not yet actionable)
    const validDeliveryStatuses = [
      'PENDING',
      'REQUESTED',
      'ASSIGNED',
      'ACCEPTED',
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED',
      'CANCELLED',
    ];
    const validRideStatuses = [
      'PENDING',
      'REQUESTED',
      'ACCEPTED',
      'ARRIVED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ];

    let statusFilter: any;
    if (status) {
      const statusArray = status.split(',').map((s) => s.trim().toUpperCase());
      statusFilter = {
        in: statusArray.filter((s) =>
          role === 'RIDER'
            ? validDeliveryStatuses.includes(s)
            : validRideStatuses.includes(s),
        ),
      };
    } else {
      statusFilter = { notIn: ['PENDING', 'REQUESTED'] };
    }

    const addressSelect = {
      select: {
        id: true,
        street: true,
        city: true,
        state: true,
        lat: true,
        lng: true,
      },
    };

    if (role === 'DRIVER') {
      const where = { riderId, status: statusFilter };
      const [total, rides] = await Promise.all([
        this.prisma.ride.count({ where }),
        this.prisma.ride.findMany({
          where,
          select: {
            id: true,
            status: true,
            totalFare: true,
            startOtp: true,
            acceptedAt: true,
            startedAt: true,
            createdAt: true,
            customer: { select: { name: true, phone: true } },
            pickupAddress: addressSelect,
            dropoffAddress: addressSelect,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);
      return {
        data: rides.map((ride) => ({
          id: ride.id,
          jobType: 'ride',
          pickupAddress: ride.pickupAddress,
          dropoffAddress: ride.dropoffAddress,
          customerName: ride.customer?.name || '',
          customerPhone: ride.customer?.phone || '',
          earnings: ride.totalFare || 0,
          startOtp: ride.startOtp,
          status: ride.status,
          assignedAt: ride.acceptedAt,
          pickedUpAt: ride.startedAt,
          createdAt: ride.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    if (role === 'RIDER') {
      const where = { riderId, status: statusFilter };
      const [total, deliveries] = await Promise.all([
        this.prisma.delivery.count({ where }),
        this.prisma.delivery.findMany({
          where,
          select: {
            id: true,
            status: true,
            deliveryFee: true,
            packageDetails: true,

            assignedAt: true,
            pickedUpAt: true,
            createdAt: true,
            customer: { select: { name: true, phone: true } },
            pickupAddress: addressSelect,
            dropoffAddress: addressSelect,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);
      return {
        data: deliveries.map((delivery) => ({
          id: delivery.id,
          jobType: 'delivery',
          pickupAddress: delivery.pickupAddress,
          dropoffAddress: delivery.dropoffAddress,
          customerName: delivery.customer?.name || '',
          customerPhone: delivery.customer?.phone || '',
          earnings: delivery.deliveryFee || 0,
          packageDetails: delivery.packageDetails,

          status: delivery.status,
          assignedAt: delivery.assignedAt,
          pickedUpAt: delivery.pickedUpAt,
          createdAt: delivery.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    this.logger.error(`Unknown rider role for riderId ${riderId}: ${role}`);
    return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }
}
