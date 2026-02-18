import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DisputesService } from './dispute.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { FilterDisputesDto } from './dto/filter-disputes.dto';
import { UpdatePriorityDto } from './dto/update-priority.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Disputes')
@ApiBearerAuth()
@Controller('super-admin/disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.CUSTOMER,
    UserRole.VENDOR,
    UserRole.RIDER,
  )
  @ApiOperation({ summary: 'Create a new dispute' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDisputeDto, @Request() req) {
    // ✅ FIX: Passed userId first to match the updated Service signature
    return this.disputesService.create(req.user.id, dto);
  }

  // 🔒 ADMIN ONLY: Support Agents + Managers + Super Admin
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  @ApiOperation({ summary: 'Get all disputes (Admin)' })
  findAll(@Query() query: FilterDisputesDto, @Request() req) {
    return this.disputesService.findAll({
      ...query,
      userId: req.user.id,
      role: req.user.role,
    });
  }

  // 🔒 ADMIN ONLY
  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  @ApiOperation({ summary: 'Get dispute statistics' })
  getStats() {
    return this.disputesService.getStats();
  }

  // ✅ SHARED: Accessible by Admins AND the specific parties involved
  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.ADMIN_SUPPORT,
    UserRole.CUSTOMER,
    UserRole.VENDOR,
    UserRole.RIDER,
  )
  @ApiOperation({ summary: 'Get dispute details' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.disputesService.findOne(id, req.user.id, req.user.role);
  }

  // ✅ SHARED: Add message to dispute
  @Post(':id/messages')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.ADMIN_SUPPORT,
    UserRole.CUSTOMER,
    UserRole.VENDOR,
    UserRole.RIDER,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add message to dispute' })
  addMessage(
    @Param('id') id: string,
    @Body() dto: AddMessageDto,
    @Request() req,
  ) {
    return this.disputesService.addMessage(id, dto, req.user.id, req.user.role);
  }

  // 🔒 ADMIN ONLY: Internal Notes
  @Post(':id/admin-notes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add internal admin note' })
  addAdminNote(
    @Param('id') id: string,
    @Body('note') note: string,
    @Request() req,
  ) {
    return this.disputesService.addAdminNote(id, note, req.user.id);
  }

  // ✅ FIX: Redirect to service method to ensure ActivityLog entry
  @Patch(':id/priority')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update dispute priority' })
  async updatePriority(
    @Param('id') id: string,
    @Body() dto: UpdatePriorityDto,
    @Request() req,
  ) {
    // Use service method instead of direct prisma update
    return this.disputesService.updatePriority(id, dto.priority, req.user.id);
  }

  // 🔒 ADMIN ONLY: Resolve
  @Post(':id/resolve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a dispute with optional refund' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @Request() req,
  ) {
    dto.adminId = req.user.id;
    return this.disputesService.resolve(id, dto, req.user.id);
  }

  // 🔒 ADMIN ONLY: Reject
  @Post(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a dispute' })
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.disputesService.reject(id, reason, req.user.id);
  }
}
