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
import { OrdersService } from './orders.service'; // Import OrdersService
import { CreateAddressDto, CreateOrderDto } from './dto/users.dto';
import {
  CreateEmergencyContactDto,
  UpdateEmergencyContactDto,
} from './dto/emergency-contact.dto';

@Controller({
  path: 'users',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly ordersService: OrdersService, // Inject OrdersService
  ) {}

  @Get('profile')
  async getProfile(@Request() req) {
    return this.usersService.getUserProfile(req.user.id);
  }

  // ==================================================================
  // ORDER ENDPOINTS (Refactored for Multi-Vendor & Idempotency)
  // ==================================================================

  // [NEW] Canonical Pricing Endpoint (Fixes Delivery Fee Shock)
  @Post('cart/quote')
  async getCartQuote(@Request() req, @Body() dto: CreateOrderDto) {
    // This calls the unified pricing logic we added to OrdersService
    return this.ordersService.calculateOrderBreakdown(req.user.id, dto);
  }

  @Post('orders')
  async createOrder(
    @Request() req,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    // Determine if this is a multi-vendor cart
    // Note: Assuming logic was moved to OrdersService for cohesion, 
    // otherwise use usersService.checkIfMultiVendor(dto.items)
    const isMultiVendor = await this.usersService.checkIfMultiVendor(dto.items);

    if (isMultiVendor) {
      // FIX: Pass idempotencyKey to the multi-vendor handler
      return this.ordersService.createMultiOrder(
        req.user.id,
        dto,
        idempotencyKey,
      );
    } else {
      // Single vendor flow
      if (!dto.restaurantId) {
        dto.restaurantId = await this.usersService.deriveRestaurantId(
          dto.items,
        );
      }
      return this.ordersService.createOrder(
        req.user.id,
        dto,
        idempotencyKey,
      );
    }
  }

  @Get('orders')
  async getMyOrders(@Request() req) {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const status = req.query.status as string | undefined;
    // Route to OrdersService directly
    return this.ordersService.getUserOrders(userId, { page, pageSize, status });
  }

  @Get('orders/:id')
  async getOrderDetails(@Request() req, @Param('id') orderId: string) {
    const userId = req.user.id;
    // Route to OrdersService directly
    const order = await this.ordersService.getOrderDetails(userId, orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  @Patch('expo-push-token')
  async updateExpoPushToken(
    @Request() req,
    @Body() body: { expoPushToken: string },
  ) {
    return this.usersService.updateExpoPushToken(
      req.user.id,
      body.expoPushToken,
    );
  }

  @Delete('expo-push-token')
  async deleteExpoPushToken(@Request() req) {
    return this.usersService.deleteExpoPushToken(req.user.id);
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

  @Delete('addresses/:id')
  async deleteAddress(@Request() req, @Param('id') addressId: string) {
    return this.usersService.deleteUserAddress(req.user.id, addressId);
  }

  // ==================================================================
  // DELIVERY & RIDE ENDPOINTS
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

  // ==================================================================
  // PROFILE MANAGEMENT
  // ==================================================================

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

  @Delete('delete-account')
  async deleteAccount(@Request() req) {
    return this.usersService.softDeleteUser(req.user.id);
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
    return this.usersService.upsertEmergencyContact(req.user.id, id, body);
  }

  @Delete('emergency-contacts/:id')
  async deleteEmergencyContact(@Request() req, @Param('id') id: string) {
    return this.usersService.deleteEmergencyContact(req.user.id, id);
  }

  // ==================================================================
  // SETTINGS & CONFIG
  // ==================================================================

  @Get('notification-config')
  async getNotificationConfig(@Request() req) {
    return this.usersService.getNotificationConfig(req.user.id);
  }

  @Patch('notification-config')
  async updateNotificationConfig(@Request() req, @Body() body: any) {
    return this.usersService.updateNotificationConfig(req.user.id, body);
  }

  // ==================================================================
  // WALLET & PAYMENT METHODS ENDPOINTS
  // ==================================================================

  @Get('wallet')
  async getWalletBalance(@Request() req) {
    return this.usersService.getWalletBalance(req.user.id);
  }

  @Get('payment/cards')

  async getSavedCards(@Request() req) {
    return this.usersService.getSavedCards(req.user.id);
  }

  @Delete('payment/cards/:id')
  async deleteSavedCard(@Request() req, @Param('id') cardId: string) {
    return this.usersService.deleteSavedCard(req.user.id, cardId);
  }
}