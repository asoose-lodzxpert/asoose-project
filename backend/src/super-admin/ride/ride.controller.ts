import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { RideFilterDto } from './dto/ride-filter.dto';
import { RidesService } from './ride.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('super-admin/rides')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Get()
  findAll(@Query() query: RideFilterDto) {
    return this.ridesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ridesService.findOne(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.ridesService.cancel(id);
  }

  @Post(':id/assign')
  @Roles('SUPER_ADMIN', 'ADMIN_MANAGER') // Higher privilege
  async assignDriver(
    @Param('id') id: string,
    @Body('riderId') riderId: string,
    @Req() req: any,
  ) {
    const adminId = req.user.id || req.user.sub;
    return this.ridesService.manualAssignDriver(id, riderId, adminId);
  }
}
