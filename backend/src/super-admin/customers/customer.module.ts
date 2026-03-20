import { Module } from '@nestjs/common';
import { UsersModule } from '../../users/users.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { ResendService } from 'src/mail/resend.service';

@Module({
  imports: [UsersModule],
  controllers: [CustomersController],
  providers: [CustomersService, ResendService],
})
export class CustomerModule {}
