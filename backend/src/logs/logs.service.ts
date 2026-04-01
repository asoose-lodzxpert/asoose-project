import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateErrorLogDto } from './dto/create-error-log.dto';

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(private prisma: PrismaService) {}

  async createErrorLog(createErrorLogDto: CreateErrorLogDto): Promise<any | null> {
    try {
      return await this.prisma.errorLog.create({
        data: createErrorLogDto,
      });
    } catch (err: any) {
      this.logger.warn(
        `[Prisma] createErrorLog failed (non-fatal): ${err?.message}`,
      );
      return null;
    }
  }

  async findAll(): Promise<any[]> {
    try {
      return await this.prisma.errorLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    } catch (err: any) {
      this.logger.warn(`[Prisma] findAll failed (non-fatal): ${err?.message}`);
      return [];
    }
  }

  async findById(id: string): Promise<any | null> {
    try {
      return await this.prisma.errorLog.findUnique({
        where: { id },
      });
    } catch (err: any) {
      this.logger.warn(
        `[Prisma] findById failed (non-fatal): ${err?.message}`,
      );
      return null;
    }
  }
}
