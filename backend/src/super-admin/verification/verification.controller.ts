// as/backend/src/super-admin/verification/verification.controller.ts
import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { VerifyDocumentDto } from './dto/verify-document.dto';

@Controller({
  path: 'super-admin/verification',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get()
  async getPending(
    @Query('type') type: string,
    @Query('search') search?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.verificationService.getPendingVerifications({
      type,
      search,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  @Patch(':type/:id/decision')
  async handleDecision(
    @Param('id') id: string,
    @Param('type') type: string,
    @Body() body: { action: string; note?: string; commissionRate?: number },
    @Request() req,
  ) {
    const adminId = req.user.id || req.user.userId;
    return this.verificationService.handleDecision(
      id,
      type,
      body.action,
      adminId,
      body.note,
      body.commissionRate,
    );
  }
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.verificationService.getVerificationById(id);
  }
}
