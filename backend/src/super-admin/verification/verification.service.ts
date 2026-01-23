import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerificationStatus, UserStatus, StoreStatus, Prisma } from '@prisma/client';

export enum VerificationEntityType {
  VENDOR = 'vendor',
  RIDER = 'rider'
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * 1.3 Server-Side Search & Pagination
   */
  async getPendingVerifications(query: { search?: string; type: string; page: number; limit: number }) {
    const skip = (query.page - 1) * query.limit;
    const isVendor = query.type === 'vendor';

    const searchFilter: any = query.search ? {
      OR: [
        { name: { contains: query.search, mode: 'insensitive' as Prisma.QueryMode } },
        { email: { contains: query.search, mode: 'insensitive' as Prisma.QueryMode } }
      ]
    } : {};

    if (isVendor) {
      const [data, total] = await Promise.all([
        this.prisma.vendor.findMany({
          where: { ...searchFilter, status: UserStatus.PENDING },
          include: { store: true, documents: true },
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.vendor.count({ where: { ...searchFilter, status: UserStatus.PENDING } })
      ]);
      return { data, total, page: query.page };
    } else {
      const [data, total] = await Promise.all([
        this.prisma.rider.findMany({
          where: { ...searchFilter, status: UserStatus.PENDING },
          include: { documents: true, vehicle: true },
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.rider.count({ where: { ...searchFilter, status: UserStatus.PENDING } })
      ]);
      return { data, total, page: query.page };
    }
  }

  /**
   * 1.2 Multi-Step Decision Flow
   * FIX: Captures updated store object to avoid the null-reference error on findUnique
   */
  async handleDecision(id: string, type: string, action: string, adminId: string, note?: string) {
    const isVendor = type === 'vendor';
    const vStatus = action === 'APPROVE' ? VerificationStatus.VERIFIED : 
                    action === 'REJECT' ? VerificationStatus.REJECTED : VerificationStatus.PENDING;
    const uStatus = action === 'APPROVE' ? UserStatus.ACTIVE : 
                    action === 'REJECT' ? UserStatus.SUSPENDED : UserStatus.PENDING;

    return await this.prisma.$transaction(async (tx) => {
      if (isVendor) {
        // 1. Update Vendor Account
        const vendor = await tx.vendor.update({
          where: { id },
          data: { status: uStatus }
        });

        // 2. Update Store Entity and Verification status - CAPTURE THE RESULT
        const store = await tx.store.update({
          where: { vendorId: id },
          data: { 
            verification: vStatus,
            status: action === 'APPROVE' ? StoreStatus.ACTIVE : StoreStatus.PENDING 
          }
        });

        // 3. Use the captured 'store.id' for the log entry
        await tx.storeLog.create({
          data: {
            storeId: store.id,
            action: `VERIFICATION_${action}`,
            details: note || `Admin ${action}ed vendor verification`,
            performedBy: adminId
          }
        });

        return vendor;
      } else {
        // 1. Update Rider Account
        const rider = await tx.rider.update({
          where: { id },
          data: { status: uStatus }
        });

        // 2. Update all Rider documents to match decision
        await tx.riderDocument.updateMany({
          where: { riderId: id },
          data: { status: vStatus }
        });

        return rider;
      }
    });
  }
}