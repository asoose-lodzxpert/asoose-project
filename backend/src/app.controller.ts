import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import type { RedisClientType } from 'redis';
import type { Response } from 'express';
import { Public } from './auth/decorators/public.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('System')
@Controller({
  path: '',
  version: '1',
})
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  @ApiOperation({ summary: 'Root endpoint' })
  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: 'Full health check (DB + Redis status)' })
  @Public()
  @Get('health')
  async health(): Promise<{
    backend: string;
    database: string;
    redis: string;
  }> {
    let dbStatus = 'ok';
    let redisStatus = 'ok';

    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB timeout')), 2000),
        ),
      ]);
    } catch (e) {
      dbStatus = 'error';
    }

    const redisTestKey = 'health:test';
    try {
      await this.redisClient.set(redisTestKey, '1', { EX: 5 });
      const value = await this.redisClient.get(redisTestKey);
      if (value !== '1') redisStatus = 'error';
    } catch (e) {
      redisStatus = 'error';
    }

    return {
      backend: 'ok',
      database: dbStatus,
      redis: redisStatus,
    };
  }

  /**
   * Liveness probe — answers: "Is the process alive?"
   * Always returns 200 as long as the Node.js process is running.
   * Used by Docker/Railway to decide whether to RESTART the container.
   */
  @ApiOperation({
    summary: 'Liveness probe — returns 200 when process is alive',
  })
  @Public()
  @Get('health/live')
  liveness() {
    return { status: 'ok' };
  }

  /**
   * Readiness probe — answers: "Can this instance serve traffic?"
   * Returns 200 only when DB and Redis are reachable.
   * Used by load balancers to decide whether to ROUTE traffic here.
   * A DB hiccup removes this instance from rotation without restarting it.
   */
  @ApiOperation({
    summary:
      'Readiness probe — returns 200 only when DB and Redis are reachable',
  })
  @Public()
  @Get('health/ready')
  async readiness(@Res() res: Response) {
    let dbStatus = 'ok';
    let redisStatus = 'ok';

    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB timeout')), 2000),
        ),
      ]);
    } catch (e) {
      dbStatus = 'error';
    }

    const redisTestKey = 'health:ready';
    try {
      await this.redisClient.set(redisTestKey, '1', { EX: 5 });
      const value = await this.redisClient.get(redisTestKey);
      if (value !== '1') redisStatus = 'error';
    } catch (e) {
      redisStatus = 'error';
    }

    const isReady = dbStatus === 'ok' && redisStatus === 'ok';
    return res
      .status(isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json({
        status: isReady ? 'ok' : 'unavailable',
        database: dbStatus,
        redis: redisStatus,
      });
  }

  // ✅ THE FIX: Public access + Consistent Path + Correct Response Key
  @ApiOperation({ summary: 'Get current maintenance mode status (public)' })
  @Public()
  @Get('settings/maintenance-mode')
  async getMaintenanceMode() {
    const cacheKey = 'system:maintenance_mode';

    // 1. Try to get from Redis first (Fast Path)
    const cachedValue = await this.redisClient.get(cacheKey);
    if (cachedValue !== null) {
      return { isEnabled: cachedValue === 'true' };
    }

    // 2. Fallback to Database (Slow Path)
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'maintenance_mode' },
    });

    const isEnabled = setting?.value === 'true';

    // 3. Store in Redis (1 hour expiration)
    // We can cache longer because SettingsService invalidates this key on update.
    await this.redisClient.set(cacheKey, String(isEnabled), {
      EX: 3600,
    });

    return { isEnabled };
  }
}
