import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): Record<string, any> {
    return {
      message: 'Backend is running ✅',
      name: 'ASOOSE Backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
