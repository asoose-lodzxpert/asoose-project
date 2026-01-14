import { Controller, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
@Controller('super-admin/verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Patch('documents/:id')
  async verifyDocument(
    @Param('id') id: string,
    @Body() dto: VerifyDocumentDto,
    @Req() req,
  ) {
    return this.verificationService.reviewDocument(id, dto, req.user.id);
  }
}
