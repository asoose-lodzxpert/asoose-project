import { Controller, Get, UseGuards } from '@nestjs/common';
import { MapsService } from './maps.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller({ path: 'super-admin/maps', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  /** Returns all riders and drivers that have a known location in Redis */
  @Get('live')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async getLiveLocations() {
    return this.mapsService.getLiveLocations();
  }
}
