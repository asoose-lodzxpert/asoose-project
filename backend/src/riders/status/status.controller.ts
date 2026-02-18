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
import { StatusService } from './status.service';
import { UpdateRiderStatusDto } from '../dto/update-status.dto';

@Controller({
  path: 'rider/status',
  version: '1',
})
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post('online')
  async goOnline(
    @Req() req,
    @Body() coords: { latitude: number; longitude: number },
  ) {
    const { id, role } = req.user || {};
    return this.statusService.goOnline(id, role, coords);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post('offline')
  async goOffline(@Req() req) {
    const { id, role } = req.user || {};
    return this.statusService.goOffline(id, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Patch('update')
  async updateStatus(@Req() req, @Body() dto: UpdateRiderStatusDto) {
    const { id } = req.user || {};
    return this.statusService.updateRiderStatus(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Get('me')
  async getRealtimeStatus(@Req() req) {
    const { id } = req.user || {};
    return this.statusService.getRealtimeStatus(id);
  }
}
