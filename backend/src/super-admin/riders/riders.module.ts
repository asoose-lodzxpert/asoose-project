import { Module } from '@nestjs/common';
import { RidersService } from './riders.service';
import { RidersController } from './rider.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [RidersController],
  providers: [RidersService],
})
export class RidersModule {}
