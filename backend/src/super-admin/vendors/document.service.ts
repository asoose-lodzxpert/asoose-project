import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerificationStatus } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async getVendorDocuments(storeId: string) {
    return this.prisma.vendorDocument.findMany({
      where: { storeId },
      orderBy: { uploadedDate: 'desc' },
    });
  }

  async verifyDocument(documentId: string) {
    try {
      return await this.prisma.vendorDocument.update({
        where: { id: documentId },
        data: { status: VerificationStatus.VERIFIED },
      });
    } catch (error) {
      // Prisma throws code 'P2025' if record not found
      throw new NotFoundException('Document not found');
    }
  }

  async rejectDocument(documentId: string) {
    try {
      return await this.prisma.vendorDocument.update({
        where: { id: documentId },
        data: { status: VerificationStatus.REJECTED },
      });
    } catch (error) {
      throw new NotFoundException('Document not found');
    }
  }
}
