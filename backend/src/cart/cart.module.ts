import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PricingService } from '../users/pricing.service';
import { FareModule } from '../fare/fare.module';

@Module({
  imports: [PrismaModule, FareModule],
  controllers: [CartController],
  providers: [CartService, PricingService],
  exports: [CartService], // Export service if OrderModule needs to validate cart later
})
export class CartModule {}
