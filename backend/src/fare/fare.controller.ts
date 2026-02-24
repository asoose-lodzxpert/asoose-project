import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DeliveryFareDto } from './dto/delivery-fare-dto';
import { RideFareDto } from './dto/ride-fare-dto';
import { FareService } from './fare.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller({
  path: 'fare',
  version: '1',
})
export class FareConntroller {
  constructor(private readonly fareService: FareService) {}

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('ride')
  rideFare(@Body() dto: RideFareDto) {
    return this.fareService.getRideFare(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('delivery')
  deliveryFare(@Body() dto: DeliveryFareDto) {
    return this.fareService.getDeliveryFare(dto);
  }
}
