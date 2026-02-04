import { Body, Controller, Post } from '@nestjs/common';
import { DeliveryFareDto } from './dto/delivery-fare-dto';
import { RideFareDto } from './dto/ride-fare-dto';
import { FareService } from './fare.service';

@Controller({
  path: 'fare',
  version: '1',
})
export class FareConntroller {
  constructor(private readonly fareService: FareService) {}
  @Post('ride')
  rideFare(@Body() dto: RideFareDto) {
    return this.fareService.getRideFare(dto);
  }

  @Post('delivery')
  deliveryFare(@Body() dto: DeliveryFareDto) {
    return this.fareService.getDeliveryFare(dto);
  }
}
