import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { RidersService } from './riders.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';

/**
 * Exposes DRIVER-role riders (ride-hailing drivers) separately from
 * RIDER-role users (delivery riders) at GET /super-admin/drivers
 */
@Controller({
  path: 'super-admin/drivers',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly ridersService: RidersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async findAll(
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('status') status?: string,
  ) {
    return this.ridersService.findAllDrivers({ search, page, limit, status });
  }
}
