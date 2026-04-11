import {
  Controller,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
  Get,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ADMIN_ROLES } from '../../auth/decorators/admin-roles.constant';
import { StatusService } from './status.service';
import { UpdateRiderStatusDto } from '../dto/update-status.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Rider / Status')
@ApiBearerAuth()
@Controller({
  path: 'rider/status',
  version: '1',
})
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @ApiOperation({
    summary: 'Set rider status to online and broadcast location',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Post('online')
  async goOnline(
    @Req() req,
    @Body() coords: { latitude: number; longitude: number },
  ) {
    const { id, role } = req.user || {};
    return this.statusService.goOnline(id, role, coords);
  }

  @ApiOperation({ summary: 'Set rider status to offline' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Post('offline')
  async goOffline(@Req() req) {
    const { id, role } = req.user || {};
    return this.statusService.goOffline(id, role);
  }

  @ApiOperation({ summary: 'Update online status and/or current coordinates' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Patch('update')
  async updateStatus(@Req() req, @Body() dto: UpdateRiderStatusDto) {
    const { id } = req.user || {};
    return this.statusService.updateRiderStatus(id, dto);
  }

  @ApiOperation({ summary: 'Get current realtime status of the rider' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Get('me')
  async getRealtimeStatus(@Req() req) {
    const { id } = req.user || {};
    return this.statusService.getRealtimeStatus(id);
  }
}
