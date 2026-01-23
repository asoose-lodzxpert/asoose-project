import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  NotFoundException,
  Post,
  Body,
  Headers,
  Patch,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateAddressDto, CreateOrderDto } from './dto/users.dto'; // <--- Import DTOs
import {
  CreateEmergencyContactDto,
  UpdateEmergencyContactDto,
} from './dto/emergency-contact.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    return this.usersService.getUserProfile(req.user.id);
  }

  @Post('orders')
  async createOrder(
    @Request() req,
    @Body() createOrderDto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string, // <--- Capture Header
  ) {
    return this.usersService.createOrder(
      req.user.id,
      createOrderDto,
      idempotencyKey, // Pass to service
    );
  }

  @Get('orders')
  async getMyOrders(@Request() req) {
    const userId = req.user.id;
    return this.usersService.getUserOrders(userId);
  }

  @Get('orders/:id')
  async getOrderDetails(@Request() req, @Param('id') orderId: string) {
    const userId = req.user.id;
    const order = await this.usersService.getOrderDetails(userId, orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // ==================================================================
  // ADDRESS ENDPOINTS
  // ==================================================================

  @Get('addresses')
  async getMyAddresses(@Request() req) {
    return this.usersService.getUserAddresses(req.user.id);
  }

  @Post('addresses')
  async addAddress(@Request() req, @Body() body: CreateAddressDto) {
    return this.usersService.addUserAddress(req.user.id, body);
  }

  // ==================================================================
  // DELIVERY & RIDE ENDPOINTS (UNCHANGED)
  // ==================================================================

  @Get('deliveries')
  async getMyDeliveries(@Request() req) {
    return this.usersService.getUserDeliveries(req.user.id);
  }

  @Get('deliveries/:id')
  async getDeliveryDetails(@Request() req, @Param('id') id: string) {
    const delivery = await this.usersService.getDeliveryDetails(
      req.user.id,
      id,
    );
    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }

  @Get('rides')
  async getMyRides(@Request() req) {
    return this.usersService.getUserRides(req.user.id);
  }

  @Get('rides/:id')
  async getRideDetails(@Request() req, @Param('id') id: string) {
    const ride = await this.usersService.getRideDetails(req.user.id, id);
    if (!ride) throw new NotFoundException('Ride not found');
    return ride;
  }
  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() body: { name: string; phone: string },
  ) {
    return this.usersService.updateUserProfile(req.user.id, body);
  }
  @Delete('profile')
  async deleteProfile(@Request() req) {
    return this.usersService.softDeleteUser(req.user.id);
  }
  @Delete('addresses/:id')
  async deleteAddress(@Request() req, @Param('id') addressId: string) {
    return this.usersService.deleteUserAddress(req.user.id, addressId);
  }

  // ==================================================================
  // EMERGENCY CONTACT ENDPOINTS
  // ==================================================================

  @Get('emergency-contacts')
  async getEmergencyContacts(@Request() req) {
    return this.usersService.getEmergencyContacts(req.user.id);
  }

  @Post('emergency-contacts')
  async addEmergencyContact(
    @Request() req,
    @Body() body: CreateEmergencyContactDto,
  ) {
    return this.usersService.addEmergencyContact(req.user.id, body);
  }

  @Patch('emergency-contacts/:id')
  async updateEmergencyContact(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateEmergencyContactDto,
  ) {
    return this.usersService.updateEmergencyContact(req.user.id, id, body);
  }

  @Delete('emergency-contacts/:id')
  async deleteEmergencyContact(@Request() req, @Param('id') id: string) {
    return this.usersService.deleteEmergencyContact(req.user.id, id);
  }

  @Delete('delete-account')
  async deleteAccount(@Request() req) {
    return this.usersService.softDeleteUser(req.user.id);
  }

  @Get('notification-config')
  async getNotificationConfig(@Request() req) {
    return this.usersService.getNotificationConfig(req.user.id);
  }

  @Patch('notification-config')
  async updateNotificationConfig(@Request() req, @Body() body: any) {
    return this.usersService.updateNotificationConfig(req.user.id, body);
  }
}
