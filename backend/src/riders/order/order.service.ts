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
    status?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    let jobs: any[] = [];

    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: { role: true },
    });

    if (!rider) throw new NotFoundException('Rider not found');
    // DeliveryStatus enum: PENDING, REQUESTED, ASSIGNED, ACCEPTED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED
    // RideStatus enum: PENDING, REQUESTED, ACCEPTED, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED
    // Default: exclude PENDING, REQUESTED
    let statusFilter: any = { notIn: ['PENDING', 'REQUESTED'] };

    if (status) {
      // Map incoming status to valid enums for DeliveryStatus
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
      const statusArray = status.split(',').map((s) => s.trim().toUpperCase());
      // Only use valid enums for filter
      if (rider?.role === 'RIDER') {
        statusFilter = {
          in: statusArray.filter((s) => validDeliveryStatuses.includes(s)),
        };
      } else if (rider?.role === 'DRIVER') {
        statusFilter = {
          in: statusArray.filter((s) => validRideStatuses.includes(s)),
        };
      }
    }

    if (rider.role === 'DRIVER') {
      const rides = await this.prisma.ride.findMany({
        where: {
          riderId,
          status: statusFilter,
        },
        include: {
          customer: { select: { name: true, phone: true } },
          pickupAddress: true,
          dropoffAddress: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      jobs = rides.map((ride) => ({
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
      }));
    } else if (rider.role === 'RIDER') {
      const deliveries = await this.prisma.delivery.findMany({
        where: {
          riderId,
          status: statusFilter,
        },
        include: {
          customer: { select: { name: true, phone: true } },
          pickupAddress: true,
          dropoffAddress: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      jobs = deliveries.map((delivery) => ({
        id: delivery.id,
        jobType: 'delivery',
        pickupAddress: delivery.pickupAddress,
        dropoffAddress: delivery.dropoffAddress,
        customerName: delivery.customer?.name || '',
        customerPhone: delivery.customer?.phone || '',
        earnings: delivery.deliveryFee || 0,
        packageDetails: delivery.packageDetails,
        deliveryOtp: delivery.deliveryOtp,
        status: delivery.status,
        assignedAt: delivery.assignedAt,
        pickedUpAt: delivery.pickedUpAt,
      }));
    } else {
      // Unknown role, log error and return empty jobs
      this.logger.error(
        `Unknown rider role for riderId ${riderId}: ${rider.role}`,
      );
      jobs = [];
    }
    const total = jobs.length;
    const paginatedData = jobs.slice(skip, skip + limit);
    return {
      data: paginatedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
