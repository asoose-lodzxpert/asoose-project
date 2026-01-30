import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  UserStatus,
  VerificationStatus,
  RideStatus,
  Prisma,
} from '@prisma/client';
import { EmailProducer } from 'src/mail/email.producer';

@Injectable()
export class RidersService {
  constructor(
    private prisma: PrismaService,
    private emailProducer: EmailProducer,
  ) {}

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }) {
    const { page, limit, search, status } = params;
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const filters: Prisma.RiderWhereInput[] = [];

    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          {
            vehicle: { plateNumber: { contains: search, mode: 'insensitive' } },
          },
        ],
      });
    }

    if (status === 'PENDING') {
      filters.push({
        OR: [
          { status: UserStatus.PENDING },
          { documents: { some: { status: VerificationStatus.PENDING } } },
        ],
      });
    } else if (status === 'ONLINE') {
      filters.push({ status: UserStatus.ACTIVE, isOnline: true });
    } else if (status === 'SUSPENDED') {
      filters.push({ status: UserStatus.SUSPENDED });
    } else if (
      status &&
      Object.values(UserStatus).includes(status as UserStatus)
    ) {
      filters.push({ status: status as UserStatus });
    }

    const where: Prisma.RiderWhereInput = filters.length
      ? { AND: filters }
      : {};

    const [riders, total, stats] = await Promise.all([
      this.prisma.rider.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: { include: { documents: true } },
          documents: true,
        },
      }),
      this.prisma.rider.count({ where }),
      this.getStats(),
    ]);

    return {
      data: riders.map((rider) => this.mapToRiderDTO(rider)),
      meta: {
        total,
        page: Number(page),
        limit: take,
        pages: Math.ceil(total / take),
      },
      stats,
    };
  }

  async findOne(id: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id },
      include: {
        vehicle: { include: { documents: true } },
        documents: true,
        bankAccount: true,
      },
    });

    if (!rider) throw new NotFoundException('Rider not found');

    const rideStats = await this.prisma.ride.groupBy({
      by: ['status'],
      where: { riderId: rider.id },
      _count: { id: true },
    });

    const ridesCount = rideStats.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count?.id ?? 0;
        return acc;
      },
      {} as Record<RideStatus, number>,
    );

    const totalTrips = Object.values(ridesCount).reduce((a, b) => a + b, 0);
    const completed = ridesCount[RideStatus.COMPLETED] || 0;
    const cancelled = ridesCount[RideStatus.CANCELLED] || 0;

    const completionRate = totalTrips > 0 ? (completed / totalTrips) * 100 : 0;
    const cancellationRate =
      totalTrips > 0 ? (cancelled / totalTrips) * 100 : 0;

    const documents = [
      ...rider.documents.map((d) => ({
        id: d.id,
        type: d.type,
        url: d.url,
        status: d.status,
        updatedAt: d.updatedAt,
        category: 'PERSONAL',
      })),
      ...(rider.vehicle?.documents.map((d) => ({
        id: d.id,
        type: d.type,
        url: d.url,
        status: 'VERIFIED' as VerificationStatus,
        updatedAt: d.updatedAt,
        category: 'VEHICLE',
      })) || []),
    ];

    return {
      id: rider.id,
      name: rider.name,
      email: rider.email,
      phone: rider.phone,
      image: rider.image || null,
      status:
        rider.status === UserStatus.ACTIVE && rider.isOnline
          ? 'ONLINE'
          : rider.status,
      verification: this.determineVerificationStatus(documents),
      rating: rider.rating,
      totalRides: rider.totalRides,
      walletBalance: rider.walletBalance,
      joinedAt: rider.createdAt,
      lastSeen: rider.updatedAt,
      currentLat: rider.currentLat,
      currentLng: rider.currentLng,
      vehicle: rider.vehicle,
      documents,
      performance: {
        completionRate: parseFloat(completionRate.toFixed(1)),
        cancellationRate: parseFloat(cancellationRate.toFixed(1)),
        totalTrips,
      },
    };
  }


  async updateStatus(id: string, status: UserStatus, adminId?: string) {
    const rider = await this.prisma.rider.findUnique({ where: { id } });
    if (!rider) throw new NotFoundException('Rider not found');

    return this.prisma.$transaction(async (tx) => {
      const updatedRider = await tx.rider.update({
        where: { id },
        data: { status },
      });

      // Log the reactivation or status change
      if (adminId) {
        await tx.activityLog.create({
          data: {
            userId: adminId,
            action: status === 'ACTIVE' ? 'RIDER_REACTIVATED' : 'RIDER_STATUS_UPDATE',
            target: id,
            details: `Rider status changed from ${rider.status} to ${status}`,
            metadata: {
              previousStatus: rider.status,
              newStatus: status,
              reason: status === 'ACTIVE' ? 'Manual Reactivation (Reverse Kill Switch)' : undefined
            }
          }
        });
      }

      return updatedRider;
    });
  }


  async verifyDocument(
    _riderId: string,
    docId: string,
    status: VerificationStatus,
  ) {
    return this.prisma.riderDocument.update({
      where: { id: docId },
      data: { status },
    });
  }

  async remove(id: string) {
    const rider = await this.prisma.rider.findUnique({ where: { id } });

    if (!rider) throw new NotFoundException('Rider not found');

    return this.prisma.rider.delete({
      where: { id },
    });
  }

  async getRiderRides(riderId: string) {
    return this.prisma.ride.findMany({
      where: { riderId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        payment: true,
      },
    });
  }

  async updateLocation(id: string, lat: number, lng: number) {
    const rider = await this.prisma.rider.findUnique({ where: { id } });

    if (!rider) throw new NotFoundException('Rider not found');

    return this.prisma.rider.update({
      where: { id },
      data: {
        currentLat: lat,
        currentLng: lng,
      },
    });
  }

  async update(
    id: string,
    data: { name?: string; phone?: string; email?: string },
  ) {
    if (data.email) {
      const existing = await this.prisma.rider.findUnique({
        where: { email: data.email },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email already in use by another user');
      }
    }

    return this.prisma.rider.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
      },
    });
  }

  async adjustWallet(
    userId: string,
    type: 'CREDIT' | 'DEBIT',
    amount: number,
    reason: string,
  ) {
    const rider = await this.prisma.rider.findUnique({ where: { id: userId } });

    if (!rider) throw new NotFoundException('Rider not found');

    const adjustment = type === 'CREDIT' ? amount : -amount;
    const newBalance = rider.walletBalance + adjustment;

    return this.prisma.$transaction(async (tx) => {
      const updatedRider = await tx.rider.update({
        where: { id: rider.id },
        data: { walletBalance: newBalance },
      });

      await tx.activityLog.create({
        data: {
          userId: 'SYSTEM',
          action: `WALLET_${type}`,
          target: rider.id,
          metadata: {
            riderId: rider.id,
            riderName: rider.name,
            reason,
            oldBalance: rider.walletBalance,
            amount,
            newBalance,
          },
        },
      });

      return updatedRider;
    });
  }

  async getPayouts(userId: string) {
    return this.prisma.riderPayout.findMany({
      where: { riderId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestPayout(userId: string, amount: number) {
    const rider = await this.prisma.rider.findUnique({ where: { id: userId } });

    if (!rider) throw new NotFoundException('Rider not found');
    if (rider.walletBalance < amount) {
      throw new BadRequestException('Insufficient funds');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.rider.update({
        where: { id: rider.id },
        data: { walletBalance: { decrement: amount } },
      });

      return tx.riderPayout.create({
        data: {
          riderId: rider.id,
          amount,
          status: 'PENDING',
        },
      });
    });
  }

  async processPayout(
    payoutId: string,
    status: 'PAID' | 'FAILED',
    reference?: string,
  ) {
    const payout = await this.prisma.riderPayout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Payout not found');

    if (status === 'FAILED') {
      await this.prisma.rider.update({
        where: { id: payout.riderId },
        data: { walletBalance: { increment: payout.amount } },
      });
    }

    return this.prisma.riderPayout.update({
      where: { id: payoutId },
      data: {
        status,
        reference,
        processedAt: new Date(),
      },
    });
  }

  // --- Helpers ---

  private mapToRiderDTO(rider: any) {
    const vehicle = rider.vehicle || {};

    let status = rider.status;
    if (rider.status === UserStatus.ACTIVE && rider.isOnline) status = 'ONLINE';

    const documents = rider.documents || [];
    const hasPendingDocs = documents.some((d: any) => d.status === 'PENDING');

    return {
      id: rider.id,
      name: rider.name,
      email: rider.email,
      plateNumber: vehicle.plateNumber || 'N/A',
      status,
      verification: hasPendingDocs ? 'PENDING' : 'VERIFIED',
      rating: rider.rating || 0,
      walletBalance: rider.walletBalance || 0,
      createdAt: rider.createdAt,
    };
  }

  private determineVerificationStatus(documents: any[]) {
    if (documents.length === 0) return 'PENDING';
    const hasPending = documents.some((d) => d.status === 'PENDING');
    const hasRejected = documents.some((d) => d.status === 'REJECTED');
    if (hasRejected) return 'REJECTED';
    if (hasPending) return 'PENDING';
    return 'VERIFIED';
  }

  private async getStats() {
    const [total, online, suspended, pending] = await Promise.all([
      this.prisma.rider.count(),
      this.prisma.rider.count({
        where: { isOnline: true, status: UserStatus.ACTIVE },
      }),
      this.prisma.rider.count({ where: { status: UserStatus.SUSPENDED } }),
      this.prisma.rider.count({ where: { status: UserStatus.PENDING } }),
    ]);

    return { total, online, suspended, pending };
  }

  async sendMessageToRider(riderId: string, message: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: { email: true, name: true },
    });

    if (!rider?.email) {
      throw new NotFoundException('Rider or email not found');
    }

    await this.emailProducer.sendVendorMessage(
      rider.email,
      `Message from Admin - ${rider.name}`,
      message,
    );

    return { success: true, message: 'Email queued successfully' };
  }

  async updateVehicle(userId: string, data: any) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: userId },
      include: { vehicle: true },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    if (!rider.vehicle) {
      throw new NotFoundException('Vehicle record not found for this rider');
    }

    return this.prisma.vehicle.update({
      where: { id: rider.vehicle.id },
      data: {
        brand: data.brand,
        model: data.model,
        year: data.year ? Number(data.year) : rider.vehicle.year,
        color: data.color,
        plateNumber: data.plateNumber,
      },
    });
  }
async getRiderPayouts(riderId: string) {
  return this.prisma.riderPayout.findMany({
    where: { 
      riderId: riderId 
    },
    orderBy: { 
      createdAt: 'desc' 
    }
  });
}

async executeKillSwitch(
    riderId: string, 
    action: 'SUSPEND' | 'BAN', 
    reason: string, 
    adminId: string
  ) {
    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');

    const targetStatus = action === 'BAN' ? UserStatus.BANNED : UserStatus.SUSPENDED;

    // Atomic Update with Side Effects
    await this.prisma.$transaction(async (tx) => {
      // 1. Update Rider State
      await tx.rider.update({
        where: { id: riderId },
        data: {
          status: targetStatus,
          isOnline: false, // Force offline immediately
          fcmToken: null,  // Revoke Push Notification Access
          // expoPushToken: null // If using Expo, clear this too
        }
      });

      // 2. Log High-Priority Audit Event
      await tx.activityLog.create({
        data: {
          userId: adminId,
          action: `RIDER_EMERGENCY_${action}`,
          target: riderId,
          details: `Emergency ${action} triggered. Reason: ${reason}`,
          metadata: {
            previousStatus: rider.status,
            reason,
            actionType: action
          }
        }
      });
    });

    // 3. (Optional) Trigger Socket Event to Force Logout on Device
    // this.socketGateway.server.to(`rider_${riderId}`).emit('force_logout');

    return { success: true, message: `Rider has been ${action}ED.` };
  }

}
