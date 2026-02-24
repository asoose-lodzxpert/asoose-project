import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
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
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @ApiOperation({ summary: 'Get paginated activity logs for a vendor store' })
  @Get(':storeId/activity')
  async getVendorActivity(
    @Param('storeId') storeId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.activityService.getVendorActivityLogs(storeId, page, limit);
  }
}
