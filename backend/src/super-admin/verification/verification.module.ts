import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Adjust path to your Prisma Service
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
@Module({
  controllers: [VerificationController],
  providers: [VerificationService, PrismaService],
})
export class VerificationModule {}