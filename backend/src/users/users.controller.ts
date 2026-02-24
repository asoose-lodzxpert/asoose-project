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
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { OrdersService } from './orders.service'; // Import OrdersService
import { CreateAddressDto, CreateOrderDto } from './dto/users.dto';
import {
  CreateEmergencyContactDto,
  UpdateEmergencyContactDto,
} from './dto/emergency-contact.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
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

  @ApiOperation({ summary: 'Get current user profile' })
  @Get('profile')
  async getProfile(@Request() req) {
    return this.usersService.getUserProfile(req.user.id);
  }

  // ==================================================================
  // ORDER ENDPOINTS (Refactored for Multi-Vendor & Idempotency)
  // ==================================================================

  // [NEW] Canonical Pricing Endpoint (Fixes Delivery Fee Shock)
  @ApiOperation({
    summary: 'Get delivery and price breakdown for cart before placing order',
  })
  @Post('cart/quote')
  async getCartQuote(@Request() req, @Body() dto: CreateOrderDto) {
    // This calls the unified pricing logic we added to OrdersService
    return this.ordersService.calculateOrderBreakdown(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Create a new order (single or multi-vendor)' })
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
      return this.ordersService.createOrder(req.user.id, dto, idempotencyKey);
    }
  }

  @ApiOperation({
    summary: 'Get current user orders with optional status filter',
  })
  @Get('orders')
  async getMyOrders(@Request() req) {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const status = req.query.status as string | undefined;
    // Route to OrdersService directly
    return this.ordersService.getUserOrders(userId, { page, pageSize, status });
  }

  @ApiOperation({ summary: 'Get details of a specific order' })
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

  // ==================================================================
  // ADDRESS ENDPOINTS
  // ==================================================================

  @ApiOperation({ summary: 'Get all saved addresses for current user' })
  @Get('addresses')
  async getMyAddresses(@Request() req) {
    return this.usersService.getUserAddresses(req.user.id);
  }

  @ApiOperation({ summary: 'Add a new address' })
  @Post('addresses')
  async addAddress(@Request() req, @Body() body: CreateAddressDto) {
    return this.usersService.addUserAddress(req.user.id, body);
  }

  @ApiOperation({ summary: 'Delete a saved address' })
  @Delete('addresses/:id')
  async deleteAddress(@Request() req, @Param('id') addressId: string) {
    return this.usersService.deleteUserAddress(req.user.id, addressId);
  }

  // ==================================================================
  // DELIVERY & RIDE ENDPOINTS
  // ==================================================================

  @ApiOperation({ summary: 'Get user deliveries with optional status filter' })
  @Get('deliveries')
  async getMyDeliveries(@Request() req) {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const status = req.query.status as string | undefined;
    return this.usersService.getUserDeliveries(userId, {
      page,
      pageSize,
      status,
    });
  }

  @ApiOperation({ summary: 'Get details of a specific delivery' })
  @Get('deliveries/:id')
  async getDeliveryDetails(@Request() req, @Param('id') id: string) {
    const delivery = await this.usersService.getDeliveryDetails(
      req.user.id,
      id,
    );
    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }

  @ApiOperation({ summary: 'Get user ride history' })
  @Get('rides')
  async getMyRides(@Request() req) {
    return this.usersService.getUserRides(req.user.id);
  }

  @ApiOperation({ summary: 'Get details of a specific ride' })
  @Get('rides/:id')
  async getRideDetails(@Request() req, @Param('id') id: string) {
    const ride = await this.usersService.getRideDetails(req.user.id, id);
    if (!ride) throw new NotFoundException('Ride not found');
    return ride;
  }

  // ==================================================================
  // PROFILE MANAGEMENT
  // ==================================================================

  @ApiOperation({ summary: 'Update user profile name/phone' })
  @Patch('profile')
  async updateProfile(
    @Request() req,
    @Body() body: { name: string; phone: string },
  ) {
    return this.usersService.updateUserProfile(req.user.id, body);
  }

  @ApiOperation({ summary: 'Soft-delete current user profile' })
  @Delete('profile')
  async deleteProfile(@Request() req) {
    return this.usersService.softDeleteUser(req.user.id);
  }

  @ApiOperation({ summary: 'Permanently delete account' })
  @Delete('delete-account')
  async deleteAccount(@Request() req) {
    return this.usersService.softDeleteUser(req.user.id);
  }

  // ==================================================================
  // EMERGENCY CONTACT ENDPOINTS
  // ==================================================================

  @ApiOperation({ summary: 'Get emergency contacts for current user' })
  @Get('emergency-contacts')
  async getEmergencyContacts(@Request() req) {
    return this.usersService.getEmergencyContacts(req.user.id);
  }

  @ApiOperation({ summary: 'Add a new emergency contact' })
  @Post('emergency-contacts')
  async addEmergencyContact(
    @Request() req,
    @Body() body: CreateEmergencyContactDto,
  ) {
    return this.usersService.addEmergencyContact(req.user.id, body);
  }

  @ApiOperation({ summary: 'Update an emergency contact' })
  @Patch('emergency-contacts/:id')
  async updateEmergencyContact(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateEmergencyContactDto,
  ) {
    return this.usersService.upsertEmergencyContact(req.user.id, id, body);
  }

  @ApiOperation({ summary: 'Delete an emergency contact' })
  @Delete('emergency-contacts/:id')
  async deleteEmergencyContact(@Request() req, @Param('id') id: string) {
    return this.usersService.deleteEmergencyContact(req.user.id, id);
  }

  // ==================================================================
  // SETTINGS & CONFIG
  // ==================================================================

  @ApiOperation({ summary: 'Get push notification configuration' })
  @Get('notification-config')
  async getNotificationConfig(@Request() req) {
    return this.usersService.getNotificationConfig(req.user.id);
  }

  @ApiOperation({ summary: 'Update push notification configuration' })
  @Patch('notification-config')
  async updateNotificationConfig(@Request() req, @Body() body: any) {
    return this.usersService.updateNotificationConfig(req.user.id, body);
  }

  // ==================================================================
  // WALLET & PAYMENT METHODS ENDPOINTS
  // ==================================================================

  @ApiOperation({ summary: 'Get wallet balance and DVA details' })
  @Get('wallet')
  async getWalletBalance(@Request() req) {
    return this.usersService.getWalletBalance(req.user.id);
  }

  @ApiOperation({
    summary: 'Provision a dedicated virtual account (DVA) for wallet top-up',
  })
  @Post('wallet/provision')
  async provisionWallet(@Request() req) {
    return this.usersService.provisionWallet(req.user.id);
  }

  @ApiOperation({ summary: 'Show or hide wallet balance on UI' })
  @Patch('wallet/visibility')
  async setWalletVisibility(@Request() req, @Body() body: { hidden: boolean }) {
    return this.usersService.setWalletVisibility(req.user.id, body.hidden);
  }

  @ApiOperation({ summary: 'Get wallet transaction history (paginated)' })
  @Get('wallet/history')
  async getWalletHistory(
    @Request() req,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.usersService.getWalletHistory(
      req.user.id,
      Number(page),
      Number(limit),
    );
  }

  /**
   * POST users/wallet/requery
   * Triggers a background Paystack requery for the user's DVA.
   * Use this when a customer reports a missing balance after a bank transfer.
   * Rate-limited by Paystack to once per 10 minutes per account number.
   */
  @ApiOperation({ summary: 'Trigger Paystack requery for missing DVA balance' })
  @Post('wallet/requery')
  async requeryWallet(@Request() req) {
    return this.usersService.requeryWallet(req.user.id);
  }

  @ApiOperation({ summary: 'Get saved payment cards' })
  @Get('payment/cards')
  async getSavedCards(@Request() req) {
    return this.usersService.getSavedCards(req.user.id);
  }

  @ApiOperation({ summary: 'Set a card as the default payment method' })
  @Patch('payment/cards/:id/default')
  async setDefaultCard(@Request() req, @Param('id') cardId: string) {
    return this.usersService.setDefaultCard(req.user.id, cardId);
  }

  @ApiOperation({ summary: 'Delete a saved payment card' })
  @Delete('payment/cards/:id')
  async deleteSavedCard(@Request() req, @Param('id') cardId: string) {
    return this.usersService.deleteSavedCard(req.user.id, cardId);
  }
}
