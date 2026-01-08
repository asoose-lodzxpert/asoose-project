import { Module, Global } from '@nestjs/common';
import { FcmService } from './fcm.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [FcmService],
  exports: [FcmService],
})
export class FcmModule {}