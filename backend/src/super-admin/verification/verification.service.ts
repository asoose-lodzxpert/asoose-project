import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Adjust path if necessary
import { VerificationStatus, UserRole, UserStatus } from '@prisma/client';
import { VerifyDocumentDto } from './dto/verify-document.dto';

@Injectable()
export class VerificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Fetches all documents currently awaiting review.
   * Required for the Super Admin Verification UI.
   */
  async getPendingDocuments() {
    return this.prisma.userDocument.findMany({
      where: { status: VerificationStatus.PENDING },
      include: { 
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true, 
            role: true 
          } 
        } 
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Processes a document review (Approve or Reject).
   * Updates the document, logs the action, and checks for user activation.
   */
  async updateDocumentStatus(docId: string, dto: VerifyDocumentDto, adminId: string) {
    const document = await this.prisma.userDocument.findUnique({
      where: { id: docId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // 1. Update the document status
    const updatedDoc = await this.prisma.userDocument.update({
      where: { id: docId },
      data: {
        status: dto.status,
        rejectionReason: dto.status === VerificationStatus.REJECTED ? dto.rejectionReason : null,
      },
    });

    // 2. Log the action to the Activity Log for the audit trail
    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: `DOCUMENT_${dto.status}`,
        target: document.userId,
        details: `Reviewed ${document.type} for user ID: ${document.userId}`,
      },
    });

    // 3. If verified, check if the user has all required docs to be activated
    if (dto.status === VerificationStatus.VERIFIED) {
      await this.checkAndActivateUser(document.userId);
    } 
    // 4. If rejected, ensure the user remains/becomes UNVERIFIED
    else if (dto.status === VerificationStatus.REJECTED) {
      await this.prisma.user.update({
        where: { id: document.userId },
        data: { 
          status: UserStatus.PENDING, 
          verificationStatus: 'UNVERIFIED' 
        },
      });
    }

    return updatedDoc;
  }

  /**
   * Automatically upgrades a User's status to ACTIVE if all required
   * documents for their specific role have been VERIFIED.
   */
  private async checkAndActivateUser(userId: string) {
    const user = await this.prisma.user.findUnique({ 
      where: { id: userId },
      include: { documents: true }
    });

    if (!user) return;

    // Define required document types per role
    let requiredTypes: string[] = [];
    if (user.role === UserRole.RIDER) {
      requiredTypes = ['DRIVER_LICENSE', 'VEHICLE_INSURANCE', 'ROAD_WORTHINESS'];
    } else if (user.role === UserRole.VENDOR) {
      requiredTypes = ['CAC_CERT', 'FOOD_SAFETY_CERT'];
    } else {
      return; // Customers/Admins do not follow this flow
    }

    // Check if every required type has at least one VERIFIED document
    const allVerified = requiredTypes.every((type) => 
      user.documents.some((doc) => doc.type === type && doc.status === VerificationStatus.VERIFIED)
    );

    if (allVerified) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          status: UserStatus.ACTIVE, //
          verificationStatus: 'VERIFIED' //
        },
      });

      // Optional: Add activity log for automatic activation
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'USER_VERIFIED',
          details: `Account automatically activated after full document verification.`,
        },
      });
    }
  }
}