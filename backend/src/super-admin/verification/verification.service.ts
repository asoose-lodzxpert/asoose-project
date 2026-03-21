import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityLogService } from 'src/common/services/activity-log.services';
import {
  VerificationStatus,
  UserStatus,
  StoreStatus,
  Prisma,
} from '@prisma/client';

export enum VerificationEntityType {
  VENDOR = 'vendor',
  RIDER = 'rider',
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private prisma: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  /**
   * 1.3 Server-Side Search & Pagination
   */
  async getPendingVerifications(query: {
    search?: string;
    type: string;
    page: number;
    limit: number;
  }) {
    const skip = (query.page - 1) * query.limit;
    const isVendor = query.type === 'vendor';

    const searchFilter: any = query.search
      ? {
          OR: [
            {
              name: {
                contains: query.search,
                mode: 'insensitive' as Prisma.QueryMode,
              },
            },
            {
              email: {
                contains: query.search,
                mode: 'insensitive' as Prisma.QueryMode,
              },
            },
          ],
        }
      : {};

    if (isVendor) {
      const [data, total] = await Promise.all([
        this.prisma.vendor.findMany({
          where: { ...searchFilter, status: UserStatus.PENDING },
          include: { store: true, documents: true },
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.vendor.count({
          where: { ...searchFilter, status: UserStatus.PENDING },
        }),
      ]);
      return { data, total, page: query.page };
    } else {
      const [data, total] = await Promise.all([
        this.prisma.rider.findMany({
          where: { ...searchFilter, status: UserStatus.PENDING },
          include: { documents: true, vehicle: true },
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.rider.count({
          where: { ...searchFilter, status: UserStatus.PENDING },
        }),
      ]);
      return { data, total, page: query.page };
    }
  }

  /**
   * 1.2 Multi-Step Decision Flow
   * FIX: Captures updated store object to avoid the null-reference error on findUnique
   * UPDATE: Added Activity Logging for auditing verification actions
   * UPDATE: On APPROVE, commissionRate falls back to global_commission system setting
   */
  async handleDecision(
    id: string,
    type: string,
    action: string,
    adminId: string,
    note?: string,
    commissionRate?: number,
  ) {
    const isVendor = type === 'vendor';
    const vStatus =
      action === 'APPROVE'
        ? VerificationStatus.VERIFIED
        : action === 'REJECT'
          ? VerificationStatus.REJECTED
          : VerificationStatus.PENDING;
    const uStatus =
      action === 'APPROVE'
        ? UserStatus.ACTIVE
        : action === 'REJECT'
          ? UserStatus.SUSPENDED
          : UserStatus.PENDING;

    // Resolve the commission rate to apply on approval.
    // Priority: explicit admin input → global_commission system setting → hardcoded default (10%).
    let resolvedCommissionRate = commissionRate;
    if (action === 'APPROVE' && resolvedCommissionRate === undefined) {
      try {
        const setting = await this.prisma.systemSetting.findUnique({
          where: { key: 'global_commission' },
        });
        if (setting?.value) {
          const parsed = parseFloat(setting.value);
          if (!isNaN(parsed)) resolvedCommissionRate = parsed;
        }
      } catch (err) {
        this.logger.warn(
          'Could not read global_commission setting, using default 10%',
          err,
        );
      }
      if (resolvedCommissionRate === undefined) resolvedCommissionRate = 10;
    }

    // 1. Perform the database update transaction
    const result = await this.prisma.$transaction(async (tx) => {
      if (isVendor) {
        // Update Vendor Account
        const vendor = await tx.vendor.update({
          where: { id },
          data: { status: uStatus },
        });

        // Update all vendor documents to match the decision
        await tx.vendorDocument.updateMany({
          where: { vendorId: id },
          data: { status: vStatus },
        });

        // Update Store Entity and Verification status (store may not exist yet)
        const existingStore = await tx.store.findFirst({
          where: { vendorId: id },
        });

        if (existingStore) {
          await tx.store.update({
            where: { id: existingStore.id },
            data: {
              verification: vStatus,
              status:
                action === 'APPROVE' ? StoreStatus.ACTIVE : StoreStatus.PENDING,
              // Apply resolved commission rate (global default or admin override)
              ...(action === 'APPROVE' && resolvedCommissionRate !== undefined
                ? { commissionRate: resolvedCommissionRate }
                : {}),
            },
          });

          // Keep existing StoreLog for vendor-specific logic
          await tx.storeLog.create({
            data: {
              storeId: existingStore.id,
              action: `VERIFICATION_${action}`,
              details: note || `Admin ${action}ed vendor verification`,
              performedBy: adminId,
            },
          });
        }

        return vendor;
      } else {
        // Update Rider Account + set their commission rate on approval
        const rider = await tx.rider.update({
          where: { id },
          data: {
            status: uStatus,
            // Apply resolved commission rate (global default or admin override)
            ...(action === 'APPROVE' && resolvedCommissionRate !== undefined
              ? { commissionRate: resolvedCommissionRate }
              : {}),
          },
        });

        // Update all Rider documents to match decision
        await tx.riderDocument.updateMany({
          where: { riderId: id },
          data: { status: vStatus },
        });

        return rider;
      }
    });

    // 2. Record in Global Activity Log (Non-blocking / outside transaction to ensure it reflects committed state)
    try {
      await this.activityLogService.record({
        userId: adminId,
        action: `VERIFICATION_${action}`,
        target: id, // The ID of the Vendor or Rider being verified
        status: 'SUCCESS',
        details: note || `Admin ${action}ed ${type} verification request`,
        metadata: {
          entityType: type,
          verificationStatus: vStatus,
          userStatus: uStatus,
        },
      });
    } catch (logError) {
      this.logger.error(
        `Failed to record activity log for verification ${id}`,
        logError,
      );
      // We do not throw here to prevent rolling back the successful verification logic
    }

    return result;
  }

  async getVerificationById(id: string) {
    // 1. Try to find as Vendor
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        store: true,
        documents: true,
      },
    });

    if (vendor) {
      return vendor;
    }

    // 2. If not found, try to find as Rider
    const rider = await this.prisma.rider.findUnique({
      where: { id },
      include: {
        vehicle: true,
        documents: true,
      },
    });

    if (rider) {
      return rider;
    }

    // 3. If neither, throw error
    throw new NotFoundException(`Verification request with ID ${id} not found`);
  }
}
