import { Controller, Get, UseGuards } from '@nestjs/common';
import { MapsService } from './maps.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Maps')
@ApiBearerAuth()
@Controller({ path: 'super-admin/maps', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @ApiOperation({
    summary: 'Get live locations of all active riders and drivers',
  })
  @Get('live')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async getLiveLocations() {
    return this.mapsService.getLiveLocations();
  }
}
