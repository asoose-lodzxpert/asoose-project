import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { DocumentsService } from './document.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Vendors')
@ApiBearerAuth()
@Controller({
  path: 'super-admin/vendors',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @ApiOperation({ summary: 'Get all documents submitted by a vendor store' })
  @Get(':storeId/documents')
  async getDocuments(@Param('storeId') storeId: string) {
    return this.documentsService.getVendorDocuments(storeId);
  }

  @ApiOperation({ summary: 'Approve a vendor document' })
  @Patch('documents/:documentId/verify')
  async verifyDocument(@Param('documentId') documentId: string) {
    return this.documentsService.verifyDocument(documentId);
  }

  @ApiOperation({ summary: 'Reject a vendor document' })
  @Patch('documents/:documentId/reject')
  async rejectDocument(@Param('documentId') documentId: string) {
    return this.documentsService.rejectDocument(documentId);
  }
}
