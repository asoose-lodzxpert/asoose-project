import {
  Controller,
  Get,
  Param,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { DeliveriesService } from './delivery.service';
import { DeliveryFilterDto } from './dto/delivery-filter.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller('super-admin/deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  findAll(@Query() query: DeliveryFilterDto) {
    return this.deliveriesService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  findOne(@Param('id') id: string) {
    return this.deliveriesService.findOne(id);
  }

  // 🔒 Cancel/Delete: Manager Only
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  remove(@Param('id') id: string) {
    return this.deliveriesService.remove(id);
  }
}
