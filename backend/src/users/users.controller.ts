import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  NotFoundException,
  Post,
  Body,
  Headers, // <--- Import Headers
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateAddressDto, CreateOrderDto } from './dto/users.dto'; // <--- Import DTOs

@Controller('users')
// @UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ==================================================================
  // ORDER ENDPOINTS
  // ==================================================================

  // NEW: This was missing!
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

  // @Get('addresses')
  // async getMyAddresses(@Request() req) {
  //   return this.usersService.getUserAddresses(req.user.id);
  // }

  @Post('addresses')
  async addAddress(@Request() req, @Body() body: CreateAddressDto) {
    // Use DTO
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
}
