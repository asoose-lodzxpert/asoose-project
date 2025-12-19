import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketplaceService } from './marketplace.service';
@Module({
  imports: [PrismaModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
})
export class MarketplaceModule {}