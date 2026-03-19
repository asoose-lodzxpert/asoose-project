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
  Post,
  Req,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { UserStatus, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Customers')
@ApiBearerAuth()
@Controller({ path: 'super-admin/customers', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @ApiOperation({
    summary: 'List all customers with optional search and pagination',
  })
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async findAll(
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    return this.customersService.findAll({ search, page, limit });
  }

  @ApiOperation({ summary: 'Get a customer by ID' })
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @ApiOperation({ summary: "Get a customer's order history" })
  @Get(':id/orders')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async getOrders(@Param('id') id: string) {
    return this.customersService.getCustomerOrders(id);
  }

  @ApiOperation({ summary: "Get a customer's ride history" })
  @Get(':id/rides')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async getRides(@Param('id') id: string) {
    return this.customersService.getCustomerRides(id);
  }

  @ApiOperation({ summary: 'Update customer name/phone/email' })
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; phone?: string; email?: string },
  ) {
    return this.customersService.update(id, body);
  }

  @ApiOperation({ summary: 'Update customer account status' })
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: UserStatus },
    @Req() req: any,
  ) {
    const adminId = req.user?.id || req.user?.sub;
    return this.customersService.updateStatus(id, body.status, adminId);
  }
  @ApiOperation({ summary: 'Delete a customer account' })
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async remove(@Param('id') id: string) {
    return this.customersService.remove(id);
  }

  @ApiOperation({ summary: 'Send a message to a single customer' })
  @Post(':id/message')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_SUPPORT,
    UserRole.ADMIN_MANAGER,
  )
  async sendMessage(
    @Param('id') id: string,
    @Body() body: { message: string },
    @Req() req: any,
  ) {
    const adminId = req.user?.id || 'SYSTEM';
    return this.customersService.sendMessage(id, body.message, adminId);
  }

  @ApiOperation({ summary: 'Suspend or ban a customer (kill-switch)' })
  @Post(':id/kill-switch')
  @Roles(UserRole.SUPER_ADMIN)
  async killSwitch(
    @Param('id') id: string,
    @Body() body: { action: 'SUSPEND' | 'BAN'; reason: string },
    @Req() req: any,
  ) {
    const adminId = req.user?.id || 'SYSTEM';
    return this.customersService.executeKillSwitch(
      id,
      body.action,
      body.reason,
      adminId,
    );
  }
}
