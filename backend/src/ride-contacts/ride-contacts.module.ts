import { Module } from '@nestjs/common';
import { RideContactsController } from './ride-contacts.controller';
import { RideContactsService } from './ride-contacts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RideContactsController],
  providers: [RideContactsService],
  exports: [RideContactsService],
})
export class RideContactsModule {}
