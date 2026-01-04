import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { DocumentsService } from './document.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('super-admin/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':storeId/documents')
  async getDocuments(@Param('storeId') storeId: string) {
    return this.documentsService.getVendorDocuments(storeId);
  }

  @Patch('documents/:documentId/verify')
  async verifyDocument(@Param('documentId') documentId: string) {
    return this.documentsService.verifyDocument(documentId);
  }

  @Patch('documents/:documentId/reject')
  async rejectDocument(@Param('documentId') documentId: string) {
    return this.documentsService.rejectDocument(documentId);
  }
}