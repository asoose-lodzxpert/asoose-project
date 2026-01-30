import { Injectable,NotFoundException } from '@nestjs/common';
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

  /**
   * Records a new activity log entry
   */
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

  /**
   * Fetches paginated activity logs with optional filtering
   * This resolves the error in ActivityLogController
   */
  async getLogs(query: any) {
    const { page = 1, limit = 10, action, userId } = query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build filter object based on query parameters
    const where: any = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      logs,
      meta: {
        total,
        page: Number(page),
        lastPage: Math.ceil(total / Number(limit)),
      },
    };
  }
  async findOne(id: string) {
  const log = await this.prisma.activityLog.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true } 
      }
    }
  });
  if (!log) throw new NotFoundException(`Log entry ${id} not found`);
  return log;
}
}