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
  BadRequestException,
  Headers, // FIX: Added Headers import
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { TripsService } from './trips.service';
import {
  RequestRideDto,
  RequestDeliveryDto,
  CancelTripDto,
  RideEstimateDto,
  VehicleType,
} from './dto/trip.dto';
import { DeliveriesService } from './deliveries.service';

@Controller({
  path: 'trips',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly deliveryService: DeliveriesService,
  ) {}

  // =============================================
  // RIDES — Static routes MUST come before :id
  // =============================================

  @Get('vehicle-types')
  getVehicleTypes() {
    return Object.values(VehicleType);
  }

  @Post('rides/estimate')
  async getRideEstimate(@Body() dto: RideEstimateDto) {
    return this.tripsService.getRideEstimate(dto);
  }

  @Get('rides/current')
  async getCurrentRide(@Request() req) {
    return this.tripsService.getCurrentRide(req.user.id);
  }

  @Post('rides/request')
  async requestRide(
    @Request() req,
    @Body() dto: RequestRideDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey)
      throw new BadRequestException(
        'Idempotency key required to prevent ghost rides.',
      );
    return this.tripsService.requestRide(req.user.id, dto, idempotencyKey);
  }

  /**
   * Get all user's rides
   * GET /trips/rides?status=REQUESTED&page=1&limit=10
   */
  @Get('rides')
  async getUserRides(
    @Request() req,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.tripsService.getUserRides(
      req.user.id,
      status,
      pageNum,
      limitNum,
    );
  }

  // Parameterized routes AFTER static routes

  @Post('rides/:id/confirm')
  async confirmRide(
    @Request() req,
    @Param('id') rideId: string,
    @Body('paymentMethod') paymentMethod: string,
  ) {
    return this.tripsService.confirmRide(req.user.id, rideId, paymentMethod);
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
   * Get Driver Location for a specific ride
   * GET /trips/rides/:id/driver-location
   */
  @Get('rides/:id/driver-location')
  async getDriverLocation(@Request() req, @Param('id') rideId: string) {
    return this.tripsService.getDriverLocation(req.user.id, rideId);
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

  /**
   * Rate a ride driver
   * POST /trips/rides/:id/rate
   */
  @Post('rides/:id/rate')
  async rateRide(
    @Request() req,
    @Param('id') rideId: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.tripsService.rateRide(req.user.id, rideId, body.rating, body.comment);
  }

  @Patch('rides/:id/arrived')
  async driverArrived(@Request() req, @Param('id') rideId: string) {
    return this.tripsService.driverArrived(rideId, req.user.id);
  }

  // =============================================
  // DELIVERIES
  // =============================================

  @Post('deliveries/request')
  async requestDelivery(
    @Request() req,
    @Body() dto: RequestDeliveryDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.deliveryService.requestDelivery(req.user.id, dto);
  }

  @Get('deliveries')
  async getUserDeliveries(@Request() req, @Query('status') status?: string) {
    return this.tripsService.getUserDeliveries(req.user.id, status);
  }

  @Get('deliveries/:id')
  async getDeliveryById(@Request() req, @Param('id') deliveryId: string) {
    return this.tripsService.getDeliveryById(req.user.id, deliveryId);
  }

  @Patch('deliveries/:id/cancel')
  async cancelDelivery(
    @Request() req,
    @Param('id') deliveryId: string,
    @Body() dto: CancelTripDto,
  ) {
    return this.tripsService.cancelDelivery(req.user.id, deliveryId, dto);
  }
}
