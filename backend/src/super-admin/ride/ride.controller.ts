import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RideFilterDto } from './dto/ride-filter.dto';
import { RidesService } from './ride.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '@prisma/client';

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
}
