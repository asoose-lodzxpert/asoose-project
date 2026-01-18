import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { VerifyDocumentDto } from './dto/verify-document.dto';
@Controller('super-admin/verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('pending')
  async getPending() {
    return this.verificationService.getPendingDocuments();
  }

  @Patch(':id')
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyDocumentDto,
    @Request() req
  ) {
    const adminId = req.user.id || req.user.userId;
    return this.verificationService.updateDocumentStatus(id, dto, adminId);
  }
}
