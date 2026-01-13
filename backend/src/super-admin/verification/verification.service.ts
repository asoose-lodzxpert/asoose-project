import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  VerifyDocumentDto,
  VerificationDecision,
} from './dto/verify-document.dto';

@Injectable()
export class VerificationService {
  constructor(private prisma: PrismaService) {}

  async reviewDocument(docId: string, dto: VerifyDocumentDto, adminId: string) {
    // 1. Update the document status
    const doc = await this.prisma.userDocument.update({
      where: { id: docId },
      data: {
        status: dto.status,
        rejectionReason:
          dto.status === VerificationDecision.REJECTED
            ? dto.rejectionReason
            : null,
      },
      include: { user: true },
    });

    // 2. Log the action (Audit Trail)
    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: `DOCUMENT_${dto.status}`,
        details: `Reviewed ${doc.type} for user ${doc.user.email}`,
      },
    });

    // 3. Trigger Auto-Approval Check
    if (dto.status === VerificationDecision.VERIFIED) {
      await this.checkAndActivateUser(doc.userId);
    }
    // 4. Handle Rejection (Downgrade user if they were active)
    else if (dto.status === VerificationDecision.REJECTED) {
      await this.prisma.user.update({
        where: { id: doc.userId },
        data: { status: 'PENDING', verificationStatus: 'UNVERIFIED' },
      });
    }

    return doc;
  }

  // --- THE CORE LOGIC ---
  private async checkAndActivateUser(userId: string) {
    // Define required documents based on user role
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    let requiredTypes: string[] = [];
    if (user.role === 'RIDER') {
      requiredTypes = [
        'DRIVER_LICENSE',
        'VEHICLE_INSURANCE',
        'ROAD_WORTHINESS',
      ];
    } else if (user.role === 'VENDOR') {
      requiredTypes = ['CAC_CERT', 'FOOD_SAFETY_CERT'];
    } else {
      return; // Customers don't need doc verification
    }

    // Fetch all user docs
    const userDocs = await this.prisma.userDocument.findMany({
      where: { userId },
    });

    // Check if ALL required types are present AND verified
    const allVerified = requiredTypes.every((type) =>
      userDocs.some((doc) => doc.type === type && doc.status === 'VERIFIED'),
    );

    if (allVerified) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          status: 'ACTIVE', // Or 'OFFLINE' for riders so they can toggle online
          verificationStatus: 'VERIFIED',
        },
      });
    }
  }
}
