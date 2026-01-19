import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TripsService } from './trips.service';
import {
  RequestRideDto,
  RequestDeliveryDto,
  CancelTripDto,
} from './dto/trip.dto';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // ========================================
  // RIDE ENDPOINTS
  // ========================================

  /**
   * Request a new ride
   * POST /trips/rides/request
   */
  @Post('rides/request')
  async requestRide(@Request() req, @Body() dto: RequestRideDto) {
    return this.tripsService.requestRide(req.user.id, dto);
  }

  /**
   * Get all user's rides
   * GET /trips/rides?status=REQUESTED
   */
  @Get('rides')
  async getUserRides(@Request() req, @Query('status') status?: string) {
    return this.tripsService.getUserRides(req.user.id, status);
  }

  /**
   * Get specific ride by ID
   * GET /trips/rides/:id
   */
  @Get('rides/:id')
  async getRideById(@Request() req, @Param('id') rideId: string) {
    return this.tripsService.getRideById(req.user.id, rideId);
  }

  /**
   * Cancel a ride
   * PATCH /trips/rides/:id/cancel
   */
  @Patch('rides/:id/cancel')
  async cancelRide(
    @Request() req,
    @Param('id') rideId: string,
    @Body() dto: CancelTripDto,
  ) {
    return this.tripsService.cancelRide(req.user.id, rideId, dto);
  }

  // ========================================
  // DELIVERY ENDPOINTS
  // ========================================

  /**
   * Request a new delivery
   * POST /trips/deliveries/request
   */
  @Post('deliveries/request')
  async requestDelivery(@Request() req, @Body() dto: RequestDeliveryDto) {
    return this.tripsService.requestDelivery(req.user.id, dto);
  }

  /**
   * Get all user's deliveries
   * GET /trips/deliveries?status=REQUESTED
   */
  @Get('deliveries')
  async getUserDeliveries(@Request() req, @Query('status') status?: string) {
    return this.tripsService.getUserDeliveries(req.user.id, status);
  }

  /**
   * Get specific delivery by ID
   * GET /trips/deliveries/:id
   */
  @Get('deliveries/:id')
  async getDeliveryById(@Request() req, @Param('id') deliveryId: string) {
    return this.tripsService.getDeliveryById(req.user.id, deliveryId);
  }

  /**
   * Cancel a delivery
   * PATCH /trips/deliveries/:id/cancel
   */
  @Patch('deliveries/:id/cancel')
  async cancelDelivery(
    @Request() req,
    @Param('id') deliveryId: string,
    @Body() dto: CancelTripDto,
  ) {
    return this.tripsService.cancelDelivery(req.user.id, deliveryId, dto);
  }
}
