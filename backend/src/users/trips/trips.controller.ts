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
  Sse,
} from '@nestjs/common';
import { Public } from '../../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ADMIN_ROLES } from '../../auth/decorators/admin-roles.constant';
import { TripsService } from './trips.service';
import {
  RequestRideDto,
  RequestDeliveryDto,
  CancelTripDto,
  RideEstimateDto,
  VehicleType,
  ReviewRideDto,
} from './dto/trip.dto';
import { DeliveriesService } from './deliveries.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Trips')
@ApiBearerAuth()
@Controller({
  path: 'trips',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER, ...ADMIN_ROLES)
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly deliveryService: DeliveriesService,
  ) {}

  // =============================================
  // RIDES — Static routes MUST come before :id
  // =============================================

  @ApiOperation({ summary: 'Get available vehicle types' })
  @Get('vehicle-types')
  getVehicleTypes() {
    return Object.values(VehicleType);
  }

  @ApiOperation({ summary: 'Get fare estimate for a ride' })
  @Post('rides/estimate')
  async getRideEstimate(@Body() dto: RideEstimateDto) {
    return this.tripsService.getRideEstimate(dto);
  }

  @ApiOperation({ summary: 'Get currently active ride for user' })
  @Get('rides/current')
  async getCurrentRide(@Request() req) {
    return this.tripsService.getCurrentRide(req.user.id);
  }

  @ApiOperation({
    summary: 'Request a new ride (requires idempotency key header)',
  })
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
  @ApiOperation({ summary: 'Get all rides for current user' })
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

  @ApiOperation({
    summary:
      'Confirm payment for a ride (call after driver accepts to pay and unlock trip start)',
  })
  @Post('rides/:id/confirm')
  async confirmRide(
    @Request() req,
    @Param('id') rideId: string,
    @Body('paymentMethod') paymentMethod: string,
    @Body('callbackUrl') callbackUrl?: string,
  ) {
    return this.tripsService.confirmRide(
      req.user.id,
      rideId,
      paymentMethod,
      callbackUrl,
    );
  }

  /**
   * Get specific ride by ID
   * GET /trips/rides/:id
   */
  @ApiOperation({ summary: 'Get a specific ride by ID' })
  @Get('rides/:id')
  async getRideById(@Request() req, @Param('id') rideId: string) {
    return this.tripsService.getRideById(req.user.id, rideId);
  }

  /**
   * Get public tracking data for a ride using OTP
   * GET /trips/rides/:id/track?otp=1234
   */
  @ApiOperation({ summary: 'Get public tracking data using ride code' })
  @Public()
  @Get('rides/:id/track')
  async getPublicTrackingData(
    @Param('id') rideId: string,
    @Query('otp') otp: string,
  ) {
    if (!otp) throw new BadRequestException('Ride code (otp) is required');
    return this.tripsService.getPublicTrackingData(rideId, otp);
  }

  /**
   * SSE Stream for public tracking
   * GET /trips/rides/:id/track/stream?otp=1234
   */
  @ApiOperation({ summary: 'SSE stream for public ride tracking' })
  @Public()
  @Sse('rides/:id/track/stream')
  streamPublicTrackingData(
    @Param('id') rideId: string,
    @Query('otp') otp: string,
  ) {
    if (!otp) throw new BadRequestException('Ride code (otp) is required');
    return this.tripsService.streamPublicTrackingData(rideId, otp);
  }

  /**
   * Confirm payment for a ride as a guest (no auth required)
   * POST /trips/rides/:id/guest-pay
   */
  @ApiOperation({ summary: 'Process payment for a ride as a guest' })
  @Public()
  @Post('rides/:id/guest-pay')
  async guestConfirmRide(
    @Param('id') rideId: string,
    @Body('otp') otp: string,
    @Body('paymentMethod') paymentMethod: string,
    @Body('callbackUrl') callbackUrl?: string,
  ) {
    if (!otp) throw new BadRequestException('Ride code (otp) is required');
    return this.tripsService.guestConfirmRide(
      rideId,
      otp,
      paymentMethod,
      callbackUrl,
    );
  }

  /**
   * Get Driver Location for a specific ride
   * GET /trips/rides/:id/driver-location
   */
  @ApiOperation({ summary: "Get driver's live location for a ride" })
  @Get('rides/:id/driver-location')
  async getDriverLocation(@Request() req, @Param('id') rideId: string) {
    return this.tripsService.getDriverLocation(req.user.id, rideId);
  }

  /**
   * Cancel a ride
   * PATCH /trips/rides/:id/cancel
   */
  @ApiOperation({ summary: 'Cancel a ride' })
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
  @ApiOperation({ summary: 'Rate a completed ride' })
  @Post('rides/:id/rate')
  async rateRide(
    @Request() req,
    @Param('id') rideId: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(
        'Rating must be an integer between 1 and 5',
      );
    }
    return this.tripsService.rateRide(
      req.user.id,
      rideId,
      rating,
      body.comment,
    );
  }

  /**
   * Review a completed ride (alias of rate that also accepts a comment)
   * POST /trips/rides/:id/review
   */
  @ApiOperation({ summary: 'Submit a review for a completed ride' })
  @Post('rides/:id/review')
  async reviewRide(
    @Request() req,
    @Param('id') rideId: string,
    @Body() dto: ReviewRideDto,
  ) {
    return this.tripsService.reviewRide(
      req.user.id,
      rideId,
      dto.rating,
      dto.comment,
    );
  }

  @ApiOperation({ summary: 'Mark driver as arrived at pickup' })
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES) // override class-level CUSTOMER — only drivers/riders can trigger arrival
  @Patch('rides/:id/arrived')
  async driverArrived(@Request() req, @Param('id') rideId: string) {
    return this.tripsService.driverArrived(rideId, req.user.id);
  }

  // =============================================
  // DELIVERIES
  // =============================================

  @ApiOperation({ summary: 'Request a new parcel delivery' })
  @Post('deliveries/request')
  async requestDelivery(
    @Request() req,
    @Body() dto: RequestDeliveryDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey)
      throw new BadRequestException(
        'Idempotency key required to prevent duplicate deliveries.',
      );
    return this.deliveryService.requestDelivery(
      req.user.id,
      dto,
      idempotencyKey,
    );
  }

  @ApiOperation({ summary: 'Get all deliveries for current user' })
  @Get('deliveries')
  async getUserDeliveries(@Request() req, @Query('status') status?: string) {
    return this.tripsService.getUserDeliveries(req.user.id, status);
  }

  @ApiOperation({ summary: 'Get a specific delivery by ID' })
  @Get('deliveries/:id')
  async getDeliveryById(@Request() req, @Param('id') deliveryId: string) {
    return this.tripsService.getDeliveryById(req.user.id, deliveryId);
  }

  @ApiOperation({ summary: 'Cancel a delivery' })
  @Patch('deliveries/:id/cancel')
  async cancelDelivery(
    @Request() req,
    @Param('id') deliveryId: string,
    @Body() dto: CancelTripDto,
  ) {
    return this.tripsService.cancelDelivery(req.user.id, deliveryId, dto);
  }
}
