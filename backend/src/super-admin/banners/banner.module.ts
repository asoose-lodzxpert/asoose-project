import { Module } from '@nestjs/common';
import { BannersController } from './banner.controller';
import { BannersService } from './banners.service';
import { StorageModule } from '../../storage/storage.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [StorageModule, PrismaModule],
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannerModule {}
