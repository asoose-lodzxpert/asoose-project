import { Module } from '@nestjs/common';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';
import { MatchingModule } from 'src/matching/matching.module';

@Module({
  imports: [PrismaModule, AuthModule, MatchingModule],
  controllers: [MapsController],
  providers: [MapsService],
})
export class MapsModule {}
