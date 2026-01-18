import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface LogOptions {
  userId: string;
  action: string;
  target?: string;
  status?: string;
  details?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  async record(options: LogOptions) {
    return this.prisma.activityLog.create({
      data: {
        userId: options.userId,
        action: options.action,
        target: options.target,
        status: options.status,
        details: options.details,
        metadata: options.metadata || {},
      },
    });
  }
}