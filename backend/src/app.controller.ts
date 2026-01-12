import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import type { RedisClientType } from 'redis';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-services')
  async testServices(): Promise<any> {
    // Test Prisma DB
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'error';
    }

    // Test Redis
    let redisStatus = 'ok';
    try {
      await this.redisClient.set('test-key', 'test-value');
      const value = await this.redisClient.get('test-key');
      if (value !== 'test-value') redisStatus = 'error';
    } catch (e) {
      redisStatus = 'error';
    }

    return {
      backend: 'ok',
      database: dbStatus,
      redis: redisStatus,
    };
  }

@Get('public/settings/maintenance')
async checkMaintenance() {
  const cacheKey = 'system:maintenance_mode';
  
  // 1. Try to get from Redis first
  const cachedValue = await this.redisClient.get(cacheKey);
  if (cachedValue !== null) {
    return { active: cachedValue === 'true' };
  }

  // 2. Fallback to Database
  const setting = await this.prisma.systemSetting.findUnique({
    where: { key: 'maintenance_mode' }
  });

  const isActive = setting?.value === 'true';

  // 3. Store in Redis for future requests (e.g., expire in 1 minute)
  await this.redisClient.set(cacheKey, String(isActive), {
    EX: 60 
  });

  return { active: isActive };
}


}
