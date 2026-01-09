import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  UserRole,
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
    const skip = (page - 1) * limit;

    // 1. Base Where Clause (Role = RIDER)
    const where: Prisma.UserWhereInput = {
      role: UserRole.RIDER,
    };

    // 2. Search Logic (Name, Email, Phone, or Plate Number)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        {
          riderProfile: {
            vehicle: { plateNumber: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    // 3. Status Filters
    if (status === 'PENDING') {
      where.OR = [
        { status: UserStatus.PENDING },
        // Pending if any RiderDocument is pending
        {
          riderProfile: {
            documents: { some: { status: VerificationStatus.PENDING } },
          },
        },
      ];
    } else if (status === 'ONLINE') {
      where.riderProfile = { isOnline: true };
      where.status = UserStatus.ACTIVE;
    } else if (status === 'SUSPENDED') {
      where.status = UserStatus.SUSPENDED;
    }

    // 4. Parallel Queries for Data + Stats
    const [riders, total, stats] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          riderProfile: {
            include: { vehicle: true, documents: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
      this.getStats(),
    ]);

    // 5. Format Response
    return {
      data: riders.map((user) => this.mapToRiderDTO(user)),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      stats,
    };
  }

  async findOne(id: string) {
    // 1. Fetch User with deep relations
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        riderProfile: {
          include: {
            vehicle: { include: { documents: true } },
            documents: true,
          },
        },
        addresses: true,
      },
    });

    if (!user || !user.riderProfile)
      throw new NotFoundException('Rider not found');

    const profileId = user.riderProfile.id;

    // 2. Calculate Real-time Performance Metrics from Ride History
    const rideStats = await this.prisma.ride.groupBy({
      by: ['status'],
      where: { riderProfileId: profileId },
      _count: { id: true },
    });

    const ridesCount = rideStats.reduce(
      (acc, curr) => {
        acc[curr.status] = curr._count.id;
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

    // 3. Combine Documents (Personal + Vehicle)
    const documents = [
      ...user.riderProfile.documents.map((d) => ({
        id: d.id,
        type: d.type,
        url: d.url,
        status: d.status,
        updatedAt: d.updatedAt,
        category: 'PERSONAL',
      })),
      ...(user.riderProfile.vehicle?.documents.map((d) => ({
        id: d.id,
        type: d.type,
        url: d.url,
        // VehicleDocs don't have a status field in schema, defaulting to VERIFIED
        status: 'VERIFIED' as VerificationStatus,
        updatedAt: d.updatedAt,
        category: 'VEHICLE',
      })) || []),
    ];

    // 4. Return DTO
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: (user as any).image || null,
      status:
        user.status === 'ACTIVE' && user.riderProfile.isOnline
          ? 'ONLINE'
          : user.status,
      verification: this.determineVerificationStatus(documents),
      rating: user.riderProfile.rating,
      totalRides: user.riderProfile.totalRides,
      walletBalance: user.riderProfile.walletBalance,
      joinedAt: user.createdAt,
      lastSeen: user.updatedAt,
      currentLat: user.riderProfile.currentLat,
      currentLng: user.riderProfile.currentLng,
      vehicle: user.riderProfile.vehicle,
      documents,
      performance: {
        completionRate: parseFloat(completionRate.toFixed(1)),
        cancellationRate: parseFloat(cancellationRate.toFixed(1)),
        totalTrips,
      },
    };
  }

  async updateStatus(id: string, status: UserStatus) {
    return this.prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  async verifyDocument(
    riderId: string,
    docId: string,
    status: VerificationStatus,
  ) {
    // Only works for RiderDocument as VehicleDocument has no status in schema
    return this.prisma.riderDocument.update({
      where: { id: docId },
      data: { status },
    });
  }

  async remove(id: string) {
    const rider = await this.prisma.user.findUnique({
      where: { id, role: UserRole.RIDER },
    });

    if (!rider) throw new NotFoundException('Rider not found');

    // Deleting User cascades to RiderProfile, Documents, etc.
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async getRiderRides(userId: string) {
    const profile = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!profile) return [];

    return this.prisma.ride.findMany({
      where: { riderProfileId: profile.id },
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
    // 1. Find the Rider Profile ID associated with this User ID
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { riderProfile: true },
    });

    if (!user || !user.riderProfile)
      throw new NotFoundException('Rider Profile not found');

    // 2. Update the profile
    return this.prisma.riderProfile.update({
      where: { id: user.riderProfile.id },
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
    // 1. Check for email duplication if email is being changed
    if (data.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email already in use by another user');
      }
    }

    // 2. Update User
    return this.prisma.user.update({
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { riderProfile: true },
    });

    if (!user || !user.riderProfile)
      throw new NotFoundException('Rider not found');

    const riderProfile = user.riderProfile; // Store reference before transaction
    const adjustment = type === 'CREDIT' ? amount : -amount;
    const newBalance = riderProfile.walletBalance + adjustment;

    // Use transaction to ensure Balance update and Log creation happen together
    return this.prisma.$transaction(async (tx) => {
      // 1. Update Wallet
      const updatedProfile = await tx.riderProfile.update({
        where: { id: riderProfile.id },
        data: { walletBalance: newBalance },
      });

      // 2. Create Audit Log
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: `WALLET_${type}`,
          target: 'Rider Wallet',
          metadata: {
            reason: reason,
            oldBalance: riderProfile.walletBalance,
            amount,
            newBalance,
          },
        },
      });

      return updatedProfile;
    });
  }

  async getPayouts(userId: string) {
    const profile = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!profile) return [];
    return this.prisma.riderPayout.findMany({
      where: { riderProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestPayout(userId: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { riderProfile: true },
    });

    if (!user?.riderProfile) throw new NotFoundException('Rider not found');
    if (user.riderProfile.walletBalance < amount)
      throw new BadRequestException('Insufficient funds');

    const riderProfile = user.riderProfile; // Store reference before transaction

    return this.prisma.$transaction(async (tx) => {
      // 1. Deduct from Wallet immediately (lock funds)
      await tx.riderProfile.update({
        where: { id: riderProfile.id },
        data: { walletBalance: { decrement: amount } },
      });

      // 2. Create Payout Record
      return tx.riderPayout.create({
        data: {
          riderProfileId: riderProfile.id,
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
      // Refund the rider if payout failed
      await this.prisma.riderProfile.update({
        where: { id: payout.riderProfileId },
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

  private mapToRiderDTO(user: any) {
    const profile = user.riderProfile || {};
    const vehicle = profile.vehicle || {};

    let status = user.status;
    if (user.status === 'ACTIVE' && profile.isOnline) status = 'ONLINE';

    // Check if any personal doc is pending
    const hasPendingDocs = profile.documents?.some(
      (d: any) => d.status === 'PENDING',
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      plateNumber: vehicle.plateNumber || 'N/A',
      status,
      verification: hasPendingDocs ? 'PENDING' : 'VERIFIED',
      rating: profile.rating || 0,
      walletBalance: profile.walletBalance || 0,
      createdAt: user.createdAt,
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
      this.prisma.user.count({ where: { role: UserRole.RIDER } }),
      this.prisma.riderProfile.count({ where: { isOnline: true } }),
      this.prisma.user.count({
        where: { role: UserRole.RIDER, status: UserStatus.SUSPENDED },
      }),
      this.prisma.user.count({
        where: { role: UserRole.RIDER, status: UserStatus.PENDING },
      }),
    ]);

    return { total, online, suspended, pending };
  }

  async sendMessageToRider(riderId: string, message: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { id: riderId },
      select: {
        // ✅ Correctly select from the related 'user' model
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    // ✅ Access fields via rider.user
    if (!rider || !rider.user?.email) {
      throw new NotFoundException('Rider or email not found');
    }

    await this.emailProducer.sendVendorMessage(
      rider.user.email,
      `Message from Admin - ${rider.user.name}`,
      message,
    );

    return { success: true, message: 'Email queued successfully' };
  }

  // ... existing methods

  // ✅ ADD THIS: Logic to update vehicle in database
  async updateVehicle(userId: string, data: any) {
    // 1. Find the rider profile associated with the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        riderProfile: {
          include: { vehicle: true },
        },
      },
    });

    if (!user || !user.riderProfile) {
      throw new NotFoundException('Rider profile not found');
    }

    if (!user.riderProfile.vehicle) {
      throw new NotFoundException('Vehicle record not found for this rider');
    }

    // 2. Update the vehicle
    return this.prisma.vehicle.update({
      where: { id: user.riderProfile.vehicle.id },
      data: {
        brand: data.brand,
        model: data.model,
        year: Number(data.year), // Ensure year is a number
        color: data.color,
        plateNumber: data.plateNumber,
      },
    });
  }
}
