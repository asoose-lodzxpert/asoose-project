import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import type { RedisClientType } from 'redis';
import { Public } from './auth/decorators/public.decorator';
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  @Get()
  getHello() {
    return this.appService.getHello();
  }

  @Public() // Health checks should generally be public
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

  // ✅ THE FIX: Public access + Consistent Path + Correct Response Key
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
