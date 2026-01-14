import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  Body,
  UseGuards,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { UserStatus } from '@prisma/client';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';

@Controller('/super-admin/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // 🔓 READ ACCESS: Support needs to view customer history to resolve tickets
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async findAll(
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.customersService.findAll({ search, page, limit });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Get(':id/orders')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async getOrders(@Param('id') id: string) {
    return this.customersService.getCustomerOrders(id);
  }

  @Get(':id/rides')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async getRides(@Param('id') id: string) {
    return this.customersService.getCustomerRides(id);
  }

  // 🔒 WRITE ACCESS: Only Managers can edit profiles or ban users
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; phone?: string; email?: string },
  ) {
    return this.customersService.update(id, body);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
  ) {
    return this.customersService.updateStatus(id, status);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }
}
