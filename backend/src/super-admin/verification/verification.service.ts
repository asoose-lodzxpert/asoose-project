import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerifyDocumentDto, VerificationDecision } from './dto/verify-document.dto';
import { VerificationStatus, UserStatus, UserRole } from '@prisma/client';

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
    // Note: We cast dto.status to VerificationStatus if the DTO enum matches the DB enum
    const updatedDoc = await this.prisma.userDocument.update({
      where: { id: docId },
      data: {
        status: dto.status as unknown as VerificationStatus,
        rejectionReason: dto.status === VerificationDecision.REJECTED ? dto.rejectionReason : null,
      },
    });

    // 2. Log the action to the Activity Log for the audit trail
    // (Ensure your ActivityLog model exists in schema.prisma, otherwise comment this out)
    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: `DOCUMENT_${dto.status}`,
        target: document.userId,
        details: `Reviewed ${document.type} for user ID: ${document.userId}`,
      },
    });

    // 3. Trigger Auto-Approval Check
    if (dto.status === VerificationDecision.VERIFIED) {
      // FIX: Changed 'doc.userId' to 'document.userId'
      await this.checkAndActivateUser(document.userId);
    } 
    // 4. Handle Rejection (Downgrade user if they were active)
    else if (dto.status === VerificationDecision.REJECTED) {
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
    
    // FIX: Use Prisma UserRole enum instead of raw strings
    if (user.role === UserRole.RIDER) {
      requiredTypes = ['DRIVER_LICENSE', 'VEHICLE_INSURANCE', 'ROAD_WORTHINESS'];
    } else if (user.role === UserRole.VENDOR) {
      requiredTypes = ['CAC_CERT', 'FOOD_SAFETY_CERT'];
    } else {
      return; // Customers/Admins do not follow this flow
    }

    // FIX: Changed 'userDocs' to 'user.documents'
    // FIX: Used VerificationStatus enum for type safety
    const allVerified = requiredTypes.every((type) => 
      user.documents.some((d) => d.type === type && d.status === VerificationStatus.VERIFIED)
    );

    if (allVerified) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          status: UserStatus.ACTIVE, 
          verificationStatus: 'VERIFIED' 
        },
      });
    }
  }
}