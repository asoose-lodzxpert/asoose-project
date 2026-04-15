import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  UserStatus,
  UserRole,
  VerificationStatus,
  RideStatus,
  Prisma,
} from '@prisma/client';
import { EmailProducer } from 'src/mail/email.producer';
import { ActivityLogService } from 'src/common/services/activity-log.services';
import { RiderAccountNotificationsService } from 'src/riders/notifications/rider-account-notifications.service';
import { TokenRevocationService } from 'src/auth/token-revocation.service';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
import { TransactionLedgerService } from 'src/super-admin/transactions/transaction-ledger.service';
import { DriverStateService } from 'src/matching/driver-state/driver-state.service';
import { RiderStateService } from 'src/matching/rider-state/rider-state.service';
import { PaystackService } from 'src/payment/paystack.service';
import { PaystackAccountService } from 'src/payment/paystack-account.service';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class RidersService {
  private readonly logger = new Logger(RidersService.name);

  constructor(
    private prisma: PrismaService,
    private emailProducer: EmailProducer,
    private logService: ActivityLogService,
    private riderNotificationsService: RiderAccountNotificationsService,
    private tokenRevocationService: TokenRevocationService,
    private notificationsGateway: NotificationsGateway,
    private transactionLedger: TransactionLedgerService,
    private driverStateService: DriverStateService,
    private riderStateService: RiderStateService,
    private readonly paystackService: PaystackService,
    private readonly paystackAccountService: PaystackAccountService,
    private readonly storageService: StorageService,
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

    const wantOnlineRider = status === 'ONLINE';
    if (status === 'PENDING') {
      filters.push({
        OR: [
          { status: UserStatus.PENDING },
          { documents: { some: { status: VerificationStatus.PENDING } } },
        ],
      });
    } else if (wantOnlineRider) {
      filters.push({ status: UserStatus.ACTIVE }); // Fetch all ACTIVE, filter by Redis below
    } else if (status === 'SUSPENDED') {
      filters.push({ status: UserStatus.SUSPENDED });
    } else if (
      status &&
      Object.values(UserStatus).includes(status as UserStatus)
    ) {
      filters.push({ status: status as UserStatus });
    }

    const where: Prisma.RiderWhereInput = {
      role: UserRole.RIDER, // Only return RIDER-role users, not DRIVERs
      ...(filters.length ? { AND: filters } : {}),
    };

    const [allRiders, total, stats] = await Promise.all([
      this.prisma.rider.findMany({
        where,
        skip: wantOnlineRider ? 0 : skip,
        take: wantOnlineRider ? 1000 : take,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: { include: { documents: true } },
          documents: true,
        },
      }),
      this.prisma.rider.count({ where }),
      this.getStats(),
    ]);

    // Enrich with real online status from Redis
    const riderRedisStates = await Promise.all(
      allRiders.map((r) =>
        this.riderStateService.getState(r.id).catch(() => null),
      ),
    );

    let enrichedRiders = allRiders.map((rider, i) => ({
      ...rider,
      _redisState: riderRedisStates[i],
    }));

    if (wantOnlineRider) {
      enrichedRiders = enrichedRiders.filter(
        (r) => r._redisState?.status === 'ONLINE',
      );
    }

    const paginatedRiders = wantOnlineRider
      ? enrichedRiders.slice(skip, skip + take)
      : enrichedRiders;

    const onlineRiderTotal = wantOnlineRider ? enrichedRiders.length : total;

    return {
      data: paginatedRiders.map((rider) =>
        this.mapToRiderDTO(rider, rider._redisState),
      ),
      meta: {
        total: onlineRiderTotal,
        page: Number(page),
        limit: take,
        pages: Math.ceil(onlineRiderTotal / take),
      },
      stats,
    };
  }

  async findAllDrivers(params: {
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

    // For ONLINE filter: fetch all ACTIVE drivers and filter by Redis state
    const wantOnline = status === 'ONLINE';
    if (wantOnline) {
      filters.push({ status: UserStatus.ACTIVE });
    } else if (status === 'SUSPENDED') {
      filters.push({ status: UserStatus.SUSPENDED });
    } else if (
      status &&
      Object.values(UserStatus).includes(status as UserStatus)
    ) {
      filters.push({ status: status as UserStatus });
    }

    const where: Prisma.RiderWhereInput = {
      role: UserRole.DRIVER, // Only return DRIVER-role users, not delivery RIDERs
      ...(filters.length ? { AND: filters } : {}),
    };

    const [allDrivers, total, driverStats] = await Promise.all([
      this.prisma.rider.findMany({
        where,
        skip: wantOnline ? 0 : skip,
        take: wantOnline ? 1000 : take,
        orderBy: { createdAt: 'desc' },
        include: {
          vehicle: { include: { documents: true } },
          documents: true,
        },
      }),
      this.prisma.rider.count({ where }),
      this.getDriverStats(),
    ]);

    // Enrich each driver with real online status from Redis
    const redisStates = await Promise.all(
      allDrivers.map((d) =>
        this.driverStateService.getState(d.id).catch(() => null),
      ),
    );

    let enrichedDrivers = allDrivers.map((driver, i) => ({
      ...driver,
      _redisState: redisStates[i],
    }));

    // If ONLINE filter was requested, apply it after Redis enrichment
    if (wantOnline) {
      enrichedDrivers = enrichedDrivers.filter(
        (d) => d._redisState?.status === 'ONLINE',
      );
    }

    // Apply pagination for ONLINE filter (was skipped above)
    const paginatedDrivers = wantOnline
      ? enrichedDrivers.slice(skip, skip + take)
      : enrichedDrivers;

    const onlineTotal = wantOnline ? enrichedDrivers.length : total;

    return {
      data: paginatedDrivers.map((driver) =>
        this.mapToRiderDTO(driver, driver._redisState),
      ),
      meta: {
        total: onlineTotal,
        page: Number(page),
        limit: take,
        pages: Math.ceil(onlineTotal / take),
      },
      stats: driverStats,
    };
  }

  async findOne(id: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id },
      include: {
        vehicle: { include: { documents: true } },
        documents: true,
        bankAccount: true,
        city: true,
      },
    });

    if (!rider) throw new NotFoundException('Rider not found');

    const [rides, activityLogs] = await Promise.all([
      this.prisma.ride.findMany({
        where: { riderId: id },
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { pickupAddress: true, dropoffAddress: true, payment: true },
      }),
      this.prisma.activityLog.findMany({
        where: { OR: [{ userId: id }, { target: id }] },
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Enrich with Redis state for accurate online/lastSeen
    const redisState = await (
      rider.role === 'DRIVER'
        ? this.driverStateService.getState(id)
        : this.riderStateService.getState(id)
    ).catch(() => null);

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
    const cancelled =
      (ridesCount[RideStatus.CANCELLED] || 0) +
      (ridesCount['CANCELLED_BY_USER' as RideStatus] || 0) +
      (ridesCount['CANCELLED_BY_DRIVER' as RideStatus] || 0);

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
        redisState?.status === 'ONLINE'
          ? 'ONLINE'
          : rider.status === UserStatus.ACTIVE && rider.isOnline
            ? 'ONLINE'
            : rider.status,
      isOnline: redisState?.status === 'ONLINE',
      verification: this.determineVerificationStatus(documents),
      rating: rider.rating,
      totalRides: rider.totalRides,
      walletBalance: rider.walletBalance,
      joinedAt: rider.createdAt,
      lastSeen: redisState?.lastSeen
        ? new Date(Number(redisState.lastSeen))
        : rider.updatedAt,
      currentLat: rider.currentLat,
      currentLng: rider.currentLng,
      cityId: rider.cityId,
      city: (rider as any).city,
      vehicle: (rider as any).vehicle,
      documents,
      rides,
      activityLogs,
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

    const updatedRider = await this.prisma.$transaction(async (tx) => {
      const result = await tx.rider.update({
        where: { id },
        data: { status },
      });

      // Log the reactivation or status change
      if (adminId) {
        await this.logService.record({
          userId: adminId,
          action:
            status === 'ACTIVE' ? 'RIDER_REACTIVATED' : 'RIDER_STATUS_UPDATE',
          target: id,
          details: `Rider status changed from ${rider.status} to ${status}`,
          metadata: {
            previousStatus: rider.status,
            newStatus: status,
            reason:
              status === 'ACTIVE'
                ? 'Manual Reactivation (Reverse Kill Switch)'
                : undefined,
          },
        });
      }

      return result;
    });

    // Revoke sessions on ban/suspend, clear revocation on reinstatement
    if (status === 'BANNED' || status === 'SUSPENDED') {
      await this.tokenRevocationService.revokeUser(id);
      this.notificationsGateway.server
        .to(`user_${id}`)
        .emit('force_logout', { reason: status.toLowerCase() });
    } else if (status === 'ACTIVE') {
      await this.tokenRevocationService.clearRevocation(id);
    }

    // Notify rider of status change
    try {
      if (['ACTIVE', 'SUSPENDED', 'BANNED', 'INACTIVE'].includes(status)) {
        const reason =
          status === 'SUSPENDED'
            ? 'Your account has been suspended'
            : status === 'BANNED'
              ? 'Your account has been permanently banned'
              : status === 'ACTIVE'
                ? 'Your account has been reactivated'
                : undefined;
        await this.riderNotificationsService.notifyAccountStatusChange(
          id,
          status as 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'INACTIVE',
          reason,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify rider of status change: ${error.message}`,
      );
    }

    return updatedRider;
  }

  async verifyDocument(
    riderId: string,
    docId: string,
    status: VerificationStatus,
    adminId: string,
  ) {
    const result = await this.prisma.riderDocument.update({
      where: { id: docId },
      data: { status },
    });

    await this.logService.record({
      userId: adminId,
      action: 'RIDER_DOC_VERIFY',
      target: riderId,
      details: `Document (${result.type}) marked as ${status}`,
      metadata: { documentId: docId, status },
    });

    // Notify rider of document verification result
    try {
      const rejectionReason =
        status === 'REJECTED'
          ? 'Your document did not meet our requirements. Please resubmit.'
          : undefined;

      await this.riderNotificationsService.notifyDocumentVerificationResult(
        riderId,
        result.type,
        status,
        rejectionReason,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify rider of document verification: ${error.message}`,
      );
    }

    return result;
  }

  async remove(id: string, adminId: string) {
    const rider = await this.prisma.rider.findUnique({ where: { id } });

    if (!rider) throw new NotFoundException('Rider not found');

    await this.prisma.rider.delete({
      where: { id },
    });

    await this.logService.record({
      userId: adminId,
      action: 'RIDER_DELETED',
      target: rider.name,
      details: `Rider account deleted`,
      metadata: { riderId: id, email: rider.email },
    });

    return { success: true };
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
    data: { 
      name?: string; 
      phone?: string; 
      email?: string; 
      image?: string;
      cityId?: string;
    },
    imageFile?: Express.Multer.File,
  ) {
    if (data.email) {
      const existing = await this.prisma.rider.findUnique({
        where: { email: data.email },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email already in use by another user');
      }
    }

    let imageUrl: string | undefined = data.image;
    if (imageFile) {
      const upload = await this.storageService.uploadFile(imageFile);
      imageUrl = upload.url;
    }

    return this.prisma.rider.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        image: imageUrl,
        cityId: data.cityId,
      },
    });
  }

  async adjustWallet(
    userId: string,
    type: 'CREDIT' | 'DEBIT',
    amount: number,
    reason: string,
    adminId: string,
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

      // Create ledger transaction record for auditability
      await tx.transaction.create({
        data: {
          type: 'ADJUSTMENT',
          amount,
          entityType: 'RIDER',
          entityId: rider.id,
          description: reason,
          status: 'COMPLETED',
          balanceBefore: rider.walletBalance,
          balanceAfter: newBalance,
          metadata: {
            adjustedBy: adminId,
            adjustmentType: type,
            reason,
          },
        },
      });

      await tx.activityLog.create({
        data: {
          userId: adminId,
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

    // Create the payout record first (PENDING, no wallet debit yet)
    const payout = await this.prisma.riderPayout.create({
      data: {
        riderId: rider.id,
        amount,
        status: 'PENDING',
      },
    });

    // Debit wallet + create ledger entry atomically via the ledger service.
    // This is the ONLY place the wallet is debited for this payout lifecycle.
    await this.transactionLedger.recordPayoutRequest(
      rider.id,
      UserRole.RIDER,
      amount,
      payout.id,
    );

    return payout;
  }

  async processPayout(
    payoutId: string,
    status: 'PAID' | 'FAILED',
    reference?: string,
  ) {
    const payout = await this.prisma.riderPayout.findUnique({
      where: { id: payoutId },
      include: {
        rider: {
          include: { bankAccount: true },
        },
      },
    });
    if (!payout) throw new NotFoundException('Payout not found');

    if (status === 'FAILED') {
      // Refund wallet via ledger — this credits the wallet AND creates the PAYOUT_FAILED
      // ledger entry atomically, so the refund is always auditable.
      await this.transactionLedger.finalizePayout(payoutId, 'FAILED');

      return this.prisma.riderPayout.update({
        where: { id: payoutId },
        data: { status: 'FAILED', processedAt: new Date() },
      });
    }

    // --- status === 'PAID': trigger Paystack transfer ---
    const bankAccount = payout.rider?.bankAccount;
    if (!bankAccount) {
      throw new BadRequestException(
        'Rider has no bank account configured for payout',
      );
    }

    // Ensure we have a Paystack recipient code (create on-the-fly if missing)
    let recipientCode = bankAccount.paystackRecipientCode;
    if (!recipientCode) {
      const recipient =
        await this.paystackAccountService.createRiderTransferRecipient({
          name: bankAccount.accountName,
          accountNumber: bankAccount.accountNumber,
          bankCode: bankAccount.bankCode,
        });
      recipientCode = recipient.recipientCode;
      await this.prisma.bankAccount.update({
        where: { id: bankAccount.id },
        data: { paystackRecipientCode: recipientCode },
      });
    }

    const transferRef = reference ?? `payout-${payoutId}-${Date.now()}`;
    const transfer = await this.paystackService.initiateTransfer(
      payout.amount,
      recipientCode,
      transferRef,
      'Rider payout disbursement',
    );

    const updatedPayout = await this.prisma.riderPayout.update({
      where: { id: payoutId },
      data: {
        status: transfer.success ? 'PAID' : 'FAILED',
        reference: transfer.transferCode ?? transferRef,
        processedAt: new Date(),
      },
    });

    // Finalize in the ledger — marks the PAYOUT_REQUESTED entry as COMPLETED
    // (or FAILED + refunds the wallet if the transfer failed).
    await this.transactionLedger.finalizePayout(
      payoutId,
      transfer.success ? 'COMPLETED' : 'FAILED',
    );

    return updatedPayout;
  }

  // --- Helpers ---

  private mapToRiderDTO(rider: any, redisState?: any) {
    const vehicle = rider.vehicle || {};

    // Prefer Redis state for truthful online status
    let status: string = rider.status;
    if (redisState) {
      if (redisState.status === 'ONLINE') {
        status = 'ONLINE';
      } else if (rider.status === UserStatus.ACTIVE) {
        status = 'ACTIVE'; // online in Prisma but offline in Redis — treat as ACTIVE
      }
    } else if (rider.status === UserStatus.ACTIVE && rider.isOnline) {
      // Fallback to Prisma field when Redis is unavailable
      status = 'ONLINE';
    }

    const documents = rider.documents || [];
    const hasPendingDocs = documents.some((d: any) => d.status === 'PENDING');

    const lastSeen: Date | null = redisState?.lastSeen
      ? new Date(Number(redisState.lastSeen))
      : null;

    return {
      id: rider.id,
      name: rider.name,
      email: rider.email,
      plateNumber: vehicle.plateNumber || 'N/A',
      status,
      isOnline: status === 'ONLINE',
      lastSeen,
      verification: hasPendingDocs ? 'PENDING' : 'VERIFIED',
      rating: rider.rating || 0,
      walletBalance: rider.walletBalance || 0,
      createdAt: rider.createdAt,
      cityId: rider.cityId,
      city: rider.city,
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

  private async getDriverStats() {
    const [total, active, suspended] = await Promise.all([
      this.prisma.rider.count({ where: { role: UserRole.DRIVER } }),
      this.prisma.rider.count({
        where: { role: UserRole.DRIVER, status: UserStatus.ACTIVE },
      }),
      this.prisma.rider.count({
        where: { role: UserRole.DRIVER, status: UserStatus.SUSPENDED },
      }),
    ]);

    return { total, active, suspended };
  }

  async sendMessageToRider(riderId: string, message: string, adminId: string) {
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

    await this.logService.record({
      userId: adminId,
      action: 'MESSAGE_SENT',
      target: riderId,
      details: `Admin sent message to rider`,
      metadata: { messageLength: message.length },
    });

    return { success: true, message: 'Email queued successfully' };
  }

  async updateVehicle(userId: string, data: any, adminId: string) {
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

    const result = await this.prisma.vehicle.update({
      where: { id: rider.vehicle.id },
      data: {
        brand: data.brand,
        model: data.model,
        year: data.year ? Number(data.year) : rider.vehicle.year,
        color: data.color,
        plateNumber: data.plateNumber,
      },
    });

    await this.logService.record({
      userId: adminId,
      action: 'RIDER_VEHICLE_UPDATE',
      target: userId,
      details: `Vehicle details updated for rider`,
      metadata: { vehicleId: result.id, updates: data },
    });

    return result;
  }

  async getRiderPayouts(riderId: string) {
    return this.prisma.riderPayout.findMany({
      where: {
        riderId: riderId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async executeKillSwitch(
    riderId: string,
    action: 'SUSPEND' | 'BAN',
    reason: string,
    adminId: string,
  ) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });
    if (!rider) throw new NotFoundException('Rider not found');

    const targetStatus =
      action === 'BAN' ? UserStatus.BANNED : UserStatus.SUSPENDED;

    // Atomic Update with Side Effects
    await this.prisma.$transaction(async (tx) => {
      // 1. Update Rider State
      await tx.rider.update({
        where: { id: riderId },
        data: {
          status: targetStatus,
          isOnline: false, // Force offline immediately
        },
      });

      // 1b. Revoke Push Notification Access (remove from central table)
      await tx.pushToken.deleteMany({
        where: { riderId },
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
            actionType: action,
          },
        },
      });
    });

    // 3. (Optional) Trigger Socket Event to Force Logout on Device
    // this.socketGateway.server.to(`rider_${riderId}`).emit('force_logout');

    // Revoke all active sessions + force socket disconnect
    await this.tokenRevocationService.revokeUser(riderId);
    this.notificationsGateway.server
      .to(`user_${riderId}`)
      .emit('force_logout', { reason: action.toLowerCase() });

    return { success: true, message: `Rider has been ${action}ED.` };
  }
}
