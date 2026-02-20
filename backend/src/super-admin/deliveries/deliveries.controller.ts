import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DeliveriesService } from './delivery.service';
import { DeliveryFilterDto } from './dto/delivery-filter.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@Controller({
  path: 'super-admin/deliveries',
  version: '1',
})
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

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    const adminId = req.user.id || req.user.sub;
    return this.deliveriesService.updateStatus(id, status as any, adminId);
  }

  @Post(':id/assign-rider')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  assignRider(
    @Param('id') id: string,
    @Body('riderId') riderId: string,
    @Req() req: any,
  ) {
    const adminId = req.user.id || req.user.sub;
    return this.deliveriesService.assignRider(id, riderId, adminId);
  }

  /**
   * Assign one rider to all deliveries belonging to an OrderGroup.
   * POST /super-admin/deliveries/groups/:groupId/assign-rider
   */
  @Post('groups/:groupId/assign-rider')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  assignRiderToGroup(
    @Param('groupId') groupId: string,
    @Body('riderId') riderId: string,
    @Req() req: any,
  ) {
    const adminId = req.user.id || req.user.sub;
    return this.deliveriesService.assignRiderToGroup(groupId, riderId, adminId);
  }
}
