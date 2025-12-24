
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; 
import { VendorController } from './vendor.controller';
import { VendorService } from './dto/vendor.service';
@Module({
  imports: [AuthModule],
  controllers: [VendorController],
  providers: [VendorService],
  exports: [VendorService], 
})
export class VendorModule {}